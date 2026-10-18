import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.PrintStream;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.util.HashSet;
import java.util.Set;

/**
 * Redirects System.in/out/err for student programs running inside CheerpJ
 * and writes an exit marker so a finished run is distinct from a hang.
 */
public class JpStdioLauncher {
    public static void main(String[] args) throws Exception {
        String stdinPath = args.length > 0 ? args[0] : "/str/jp-stdin.txt";
        String stdoutPath = args.length > 1 ? args[1] : "/files/jp-stdout.txt";
        String stderrPath = args.length > 2 ? args[2] : "/files/jp-stderr.txt";
        String exitPath = args.length > 3 ? args[3] : "/files/jp-exit.txt";
        String entryClass = args.length > 4 ? args[4] : "Main";
        String exitToken = args.length > 5 ? args[5] : "done";

        File stdinFile = new File(stdinPath);
        InputStream in;
        if (stdinFile.exists() && stdinFile.length() > 0) {
            in = new FileInputStream(stdinFile);
        } else {
            in = new ByteArrayInputStream(new byte[0]);
        }
        System.setIn(in);

        PrintStream out = new PrintStream(new FileOutputStream(stdoutPath), true, "UTF-8");
        PrintStream err = new PrintStream(new FileOutputStream(stderrPath), true, "UTF-8");
        System.setOut(out);
        System.setErr(err);

        int code = 0;
        Set<Thread> existing = snapshotThreads();
        try {
            Method main = Class.forName(entryClass).getMethod("main", String[].class);
            main.invoke(null, (Object) new String[0]);
        } catch (NoSuchMethodException e) {
            err.println("This example compiled, but it has no main method to run.");
            code = 1;
        } catch (InvocationTargetException e) {
            Throwable cause = e.getCause() != null ? e.getCause() : e;
            cause.printStackTrace(err);
            code = 1;
        } catch (Throwable t) {
            t.printStackTrace(err);
            code = 1;
        } finally {
            joinNewUserThreads(existing);
            out.flush();
            err.flush();
            out.close();
            err.close();
            try {
                in.close();
            } catch (Exception ignored) {
            }
            writeExitMarker(exitPath, exitToken, code);
        }
    }

    private static void writeExitMarker(String exitPath, String token, int code) {
        try {
            PrintStream exit = new PrintStream(new FileOutputStream(exitPath), true, "UTF-8");
            exit.println(token);
            exit.println(code);
            exit.close();
        } catch (Exception ignored) {
        }
    }

    /** CheerpJ's getAllStackTraces() is empty; enumerate() still sees user threads. */
    private static Set<Thread> snapshotThreads() {
        Thread[] threads = new Thread[Math.max(8, Thread.activeCount() + 16)];
        int n = Thread.enumerate(threads);
        Set<Thread> set = new HashSet<Thread>();
        for (int i = 0; i < n; i++) {
            if (threads[i] != null) {
                set.add(threads[i]);
            }
        }
        return set;
    }

    /** Like a desktop JVM: keep stdout open until threads started by main() finish. */
    private static void joinNewUserThreads(Set<Thread> existing) {
        Thread current = Thread.currentThread();
        while (true) {
            Thread pending = null;
            for (Thread t : snapshotThreads()) {
                if (t == current || t.isDaemon() || !t.isAlive() || existing.contains(t)) {
                    continue;
                }
                pending = t;
                break;
            }
            if (pending == null) {
                return;
            }
            try {
                pending.join();
            } catch (InterruptedException e) {
                current.interrupt();
                return;
            }
        }
    }
}
