import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.PrintStream;
import java.io.PrintWriter;
import java.io.StringWriter;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.net.URL;
import java.net.URLClassLoader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.HashSet;
import java.util.Set;

import org.eclipse.jdt.core.compiler.batch.BatchCompiler;

/**
 * Long-lived compile-and-run server for the Java playground.
 *
 * Loading ECJ and indexing the Java 17 module image costs around 30 seconds, and
 * CheerpJ does not keep statics between `cheerpjRunMain` calls — so every compile
 * paid that cost again. This process pays it once, then answers requests in about
 * 150 ms each.
 *
 * Protocol, deliberately plain text so both sides stay easy to read:
 *
 *   request   /str/jp-request.txt, rewritten by JS for each request
 *             line 1  request id
 *             line 2  entry class
 *             line 3  source path
 *             line 4  output directory
 *             line 5  runMain: "true" or "false"
 *             line 6+ one stdin path per run, or "-" for empty
 *
 *   response  <responseDir>/resp-<id>.txt
 *             line 1  "COMPILE ok" or "COMPILE fail"
 *             line 2+ one "RUN <exitCode>" per case
 *             compiler output, stdout and stderr go to sibling files
 *
 * JS polls for the response file rather than us pushing, because there is no way
 * to call out of a running CheerpJ program.
 */
public class JpServer {
    public static void main(String[] args) throws Exception {
        String staged = arg(args, 0, "/files/jp-jdk");
        String sourceLevel = arg(args, 1, "-17");
        String requestPath = arg(args, 2, "/str/jp-request.txt");
        String responseDir = arg(args, 3, "/files/jp");
        // Response files outlive the page in IndexedDB, so every answer is tagged
        // with the session that asked. Without it a fresh page reads the previous
        // session's reply to request 1 and reports its output as the new result.
        String session = arg(args, 4, "s");
        int idleMs = Integer.parseInt(arg(args, 5, "40"));

        new File(responseDir).mkdirs();

        long warmStart = System.currentTimeMillis();
        String warmSource = responseDir + "/JpWarm.java";
        writeText(warmSource,
            "import java.util.ArrayList;\n"
            + "public class JpWarm {\n"
            + "    record Warm(int x) {}\n"
            + "    public static void main(String[] a) {\n"
            + "        var list = new ArrayList<String>();\n"
            + "        list.add(new Warm(1).toString());\n"
            + "        System.out.println(list.size());\n"
            + "    }\n"
            + "}\n");
        compile(staged, sourceLevel, warmSource, responseDir + "/warm-classes");
        writeText(responseDir + "/resp-" + session + "-ready.txt",
            "READY " + (System.currentTimeMillis() - warmStart) + "\n");

        String lastSeen = "";
        String previousId = null;
        while (true) {
            String request = readIfChanged(requestPath, lastSeen);
            if (request == null) {
                Thread.sleep(idleMs);
                continue;
            }
            lastSeen = request;
            try {
                String id = request.split("\n")[0].trim();
                discard(responseDir, previousId);
                previousId = id;
                serve(staged, sourceLevel, responseDir, request);
            } catch (Throwable t) {
                // A request must never take the server down with it.
                writeText(responseDir + "/resp-error.txt", String.valueOf(t));
            }
        }
    }

    /** Drop the previous request's files so a long session does not fill IndexedDB. */
    static void discard(String responseDir, String id) {
        if (id == null) return;
        File[] files = new File(responseDir).listFiles();
        if (files == null) return;
        for (File f : files) {
            if (f.getName().startsWith(id + "-")) f.delete();
        }
    }

    static void serve(String staged, String sourceLevel, String responseDir, String request) {
        String[] lines = request.split("\n");
        if (lines.length < 5) return;

        String id = lines[0].trim();
        String entryClass = lines[1].trim();
        String sourcePath = lines[2].trim();
        String outDir = lines[3].trim();
        boolean runMain = Boolean.parseBoolean(lines[4].trim());

        StringBuilder response = new StringBuilder();
        String compilerOutput = compile(staged, sourceLevel, sourcePath, outDir);
        if (compilerOutput != null) {
            writeText(responseDir + "/" + id + "-compile.txt", compilerOutput);
            response.append("COMPILE fail\n");
            writeText(responseDir + "/resp-" + id + ".txt", response.toString());
            return;
        }
        response.append("COMPILE ok\n");

        if (!runMain) {
            writeText(responseDir + "/resp-" + id + ".txt", response.toString());
            return;
        }

        for (int i = 5; i < lines.length; i++) {
            String stdinPath = lines[i].trim();
            int exit = run(outDir, entryClass, stdinPath,
                responseDir + "/" + id + "-" + (i - 5) + "-out.txt",
                responseDir + "/" + id + "-" + (i - 5) + "-err.txt");
            response.append("RUN ").append(exit).append('\n');
        }
        writeText(responseDir + "/resp-" + id + ".txt", response.toString());
    }

    /** Returns null when compilation succeeded, otherwise the compiler's complaint. */
    static String compile(String staged, String sourceLevel, String sourcePath, String outDir) {
        StringWriter out = new StringWriter();
        StringWriter err = new StringWriter();
        StringBuilder command = new StringBuilder();
        command.append(sourceLevel).append(' ');
        if (staged != null && !staged.isEmpty()) {
            command.append("--system ").append(staged).append(' ');
        }
        command.append("-nowarn -proc:none -d ").append(outDir).append(' ').append(sourcePath);

        boolean ok = BatchCompiler.compile(
            command.toString(), new PrintWriter(out), new PrintWriter(err), null);
        if (ok) return null;
        String problems = err.toString().trim();
        return problems.isEmpty() ? out.toString().trim() : problems;
    }

    /**
     * Run the student's main with stdio redirected to files, in a throwaway class
     * loader so each run sees fresh statics.
     */
    static int run(String classDir, String entryClass, String stdinPath, String outPath, String errPath) {
        InputStream originalIn = System.in;
        PrintStream originalOut = System.out;
        PrintStream originalErr = System.err;
        PrintStream out = null;
        PrintStream err = null;
        URLClassLoader loader = null;
        int code = 0;
        try {
            InputStream in = new ByteArrayInputStream(new byte[0]);
            if (!"-".equals(stdinPath)) {
                File f = new File(stdinPath);
                if (f.exists() && f.length() > 0) in = new FileInputStream(f);
            }
            out = new PrintStream(new FileOutputStream(outPath), true, "UTF-8");
            err = new PrintStream(new FileOutputStream(errPath), true, "UTF-8");
            System.setIn(in);
            System.setOut(out);
            System.setErr(err);

            loader = new URLClassLoader(new URL[] { new File(classDir).toURI().toURL() },
                JpServer.class.getClassLoader().getParent());
            Set<Thread> existing = snapshotThreads();
            try {
                Method main = Class.forName(entryClass, true, loader).getMethod("main", String[].class);
                main.invoke(null, (Object) new String[0]);
            } catch (NoSuchMethodException e) {
                err.println("This example compiled, but it has no main method to run.");
                code = 1;
            } catch (InvocationTargetException e) {
                Throwable cause = e.getCause() != null ? e.getCause() : e;
                cause.printStackTrace(err);
                code = 1;
            } finally {
                joinNewUserThreads(existing);
            }
        } catch (Throwable t) {
            if (err != null) t.printStackTrace(err);
            code = 1;
        } finally {
            System.setIn(originalIn);
            System.setOut(originalOut);
            System.setErr(originalErr);
            closeQuietly(out);
            closeQuietly(err);
            closeQuietly(loader);
        }
        return code;
    }

    static String arg(String[] args, int i, String fallback) {
        return args.length > i && !args[i].isEmpty() ? args[i] : fallback;
    }

    static String readIfChanged(String path, String lastSeen) {
        try {
            File f = new File(path);
            if (!f.exists()) return null;
            String body = new String(Files.readAllBytes(f.toPath()), StandardCharsets.UTF_8).trim();
            if (body.isEmpty() || body.equals(lastSeen)) return null;
            return body;
        } catch (Exception e) {
            return null;
        }
    }

    static void writeText(String path, String body) {
        try (PrintStream out = new PrintStream(new FileOutputStream(path), true, "UTF-8")) {
            out.print(body);
        } catch (Exception ignored) {
        }
    }

    static void closeQuietly(AutoCloseable c) {
        if (c == null) return;
        try {
            c.close();
        } catch (Exception ignored) {
        }
    }

    /** CheerpJ's getAllStackTraces() is empty; enumerate() still sees user threads. */
    static Set<Thread> snapshotThreads() {
        Thread[] threads = new Thread[Math.max(8, Thread.activeCount() + 16)];
        int n = Thread.enumerate(threads);
        Set<Thread> set = new HashSet<Thread>();
        for (int i = 0; i < n; i++) {
            if (threads[i] != null) set.add(threads[i]);
        }
        return set;
    }

    /** Like a desktop JVM: keep stdout open until threads started by main() finish. */
    static void joinNewUserThreads(Set<Thread> existing) {
        Thread current = Thread.currentThread();
        while (true) {
            Thread pending = null;
            for (Thread t : snapshotThreads()) {
                if (t == current || t.isDaemon() || !t.isAlive() || existing.contains(t)) continue;
                pending = t;
                break;
            }
            if (pending == null) return;
            try {
                pending.join();
            } catch (InterruptedException e) {
                current.interrupt();
                return;
            }
        }
    }
}
