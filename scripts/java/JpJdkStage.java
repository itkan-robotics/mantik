import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;

/**
 * Assemble a compiler-usable JDK inside CheerpJ's writable /files mount.
 *
 * CheerpJ's Java 17 runtime carries the class library at /lt/17/lib/modules but
 * none of the files a compiler looks for, and /lt is read-only. ECJ decides whether
 * a directory is a JDK by reading `release` for a JAVA_VERSION, and opens a jimage
 * through `lib/jrt-fs.jar` — so all three have to sit together somewhere writable.
 *
 * Copying is cheap (the jimage moves at ~175 MB/s) and /files persists in
 * IndexedDB, so this runs once per browser and then no-ops.
 *
 * Usage: JpJdkStage <source> <destination> [<source> <destination> ...]
 */
public class JpJdkStage {
    public static void main(String[] args) throws Exception {
        if (args.length == 0 || args.length % 2 != 0) {
            System.out.println("RESULT error: expected pairs of source and destination");
            return;
        }
        for (int i = 0; i < args.length; i += 2) {
            stage(args[i], args[i + 1]);
        }
        System.out.println("RESULT ok");
    }

    static void stage(String from, String to) throws Exception {
        File src = new File(from);
        if (!src.exists()) {
            System.out.println("MISSING " + from);
            return;
        }
        File dest = new File(to);
        if (dest.exists() && dest.length() == src.length()) {
            System.out.println("CACHED " + to + " " + dest.length());
            return;
        }
        File parent = dest.getParentFile();
        if (parent != null && !parent.exists() && !parent.mkdirs()) {
            System.out.println("FAILED mkdir " + parent);
            return;
        }

        long started = System.currentTimeMillis();
        long total = 0;
        try (InputStream in = new FileInputStream(src); OutputStream out = new FileOutputStream(dest)) {
            byte[] buffer = new byte[1 << 20];
            int n;
            while ((n = in.read(buffer)) > 0) {
                out.write(buffer, 0, n);
                total += n;
            }
        }
        System.out.println("COPIED " + to + " " + total + " " + (System.currentTimeMillis() - started) + "ms");
    }
}
