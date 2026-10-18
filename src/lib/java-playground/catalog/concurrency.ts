import { pg } from './helpers';
import type { JavaPlaygroundExercise } from '../types';

export const CONCURRENCY: JavaPlaygroundExercise[] = [
  pg(
    'java-threads-basics',
    'Practice: threads',
    `Start a thread that prints worker. Join it, then print done.

Expected:

worker
done`,
    `public class Main {
    public static void main(String[] args) throws Exception {
        Thread t = new Thread(new Runnable() {
            public void run() {
                System.out.println("worker");
            }
        });
        // start t (not run), join, then print done
    }
}
`,
    [{ name: 'Join worker', stdout: 'worker\ndone' }],
  ),
  pg(
    'java-race-conditions',
    'Practice: synchronized',
    `Two threads should each call inc() 1000 times on the same Counter. Make inc() safe (synchronized). Join both, then print the total.

Expected:

2000`,
    `class Counter {
    int value;

    void inc() {
        value++;
    }
}

public class Main {
    public static void main(String[] args) throws Exception {
        final Counter c = new Counter();
        Thread a = new Thread(new Runnable() {
            public void run() {
                for (int i = 0; i < 1000; i++) {
                    c.inc();
                }
            }
        });
        Thread b = new Thread(new Runnable() {
            public void run() {
                for (int i = 0; i < 1000; i++) {
                    c.inc();
                }
            }
        });
        // start both, join both, print c.value
    }
}
`,
    [{ name: 'Two threads, 2000', stdout: '2000' }],
  ),
  pg(
    'java-executors',
    'Practice: executor',
    `Submit a task that prints pool. After shutdown and wait, print done.

Expected:

pool
done`,
    `import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

public class Main {
    public static void main(String[] args) throws Exception {
        ExecutorService ex = Executors.newSingleThreadExecutor();
        ex.submit(new Runnable() {
            public void run() {
                // print pool from this task
            }
        });
        ex.shutdown();
        ex.awaitTermination(2, TimeUnit.SECONDS);
        System.out.println("done");
    }
}
`,
    [{ name: 'Task then done', stdout: 'pool\ndone' }],
  ),
  pg(
    'java-concurrent-collections',
    'Practice: ConcurrentHashMap',
    `Two threads each put one key into the same ConcurrentHashMap. Join both, then print the size.

Expected:

2`,
    `import java.util.concurrent.ConcurrentHashMap;

public class Main {
    public static void main(String[] args) throws Exception {
        final ConcurrentHashMap<String, Integer> map = new ConcurrentHashMap<String, Integer>();
        Thread a = new Thread(new Runnable() {
            public void run() {
                map.put("a", 1);
            }
        });
        Thread b = new Thread(new Runnable() {
            public void run() {
                map.put("b", 1);
            }
        });
        // start both, join both, print map.size()
    }
}
`,
    [{ name: 'Two puts', stdout: '2' }],
  ),
];
