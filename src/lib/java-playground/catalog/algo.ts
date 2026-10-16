import { main, pg } from './helpers';
import type { JavaPlaygroundExercise } from '../types';

export const ALGORITHMS: JavaPlaygroundExercise[] = [
  pg(
    'java-algo-recursion',
    'Practice: recursion',
    `Write factorial so factorial(5) prints 120.

Expected:

120`,
    `public class Main {
    static int factorial(int n) {
        return 0;
    }

    public static void main(String[] args) {
        System.out.println(factorial(5));
    }
}
`,
    [{ name: 'factorial(5)', stdout: '120' }],
  ),
  pg(
    'java-algo-searching',
    'Practice: search',
    `Find the index of 14 in a sorted array. If it is missing, print -1.

Expected:

-1`,
    main(`        int[] values = {2, 5, 8, 11, 17, 20};
        int target = 14;
        // print the index of target, or -1`),
    [{ name: 'Not found', stdout: '-1' }],
  ),
  pg(
    'java-algo-sorting',
    'Practice: sort',
    `Sort the array ascending and print each value on its own line.

Expected:

1
2
3`,
    main(`        int[] values = {3, 1, 2};
        // sort, then print`),
    [{ name: 'Sorted', stdout: '1\n2\n3' }],
  ),
  pg(
    'java-algo-tree-traversals',
    'Practice: preorder',
    `Print a preorder walk (node, left, right) of the starter tree.

Expected:

2
1
3`,
    `class Node {
    int value;
    Node left;
    Node right;

    Node(int value) {
        this.value = value;
    }
}

public class Main {
    static void preorder(Node node) {
        // print, left, right
    }

    public static void main(String[] args) {
        Node root = new Node(2);
        root.left = new Node(1);
        root.right = new Node(3);
        preorder(root);
    }
}
`,
    [{ name: 'Preorder', stdout: '2\n1\n3' }],
  ),
  pg(
    'java-algo-dfs',
    'Practice: DFS',
    `Neighbors of 0 are 1 then 2. Neighbors of 1 are 3. DFS from 0, print each node when you first visit it (mark before recurse).

Expected:

0
1
3
2`,
    `import java.util.ArrayList;

public class Main {
    static void dfs(ArrayList<ArrayList<Integer>> g, boolean[] seen, int node) {
        // mark, print, recurse
    }

    public static void main(String[] args) {
        ArrayList<ArrayList<Integer>> g = new ArrayList<ArrayList<Integer>>();
        g.add(new ArrayList<Integer>());
        g.add(new ArrayList<Integer>());
        g.add(new ArrayList<Integer>());
        g.add(new ArrayList<Integer>());
        g.get(0).add(1);
        g.get(0).add(2);
        g.get(1).add(3);
        boolean[] seen = new boolean[4];
        dfs(g, seen, 0);
    }
}
`,
    [{ name: 'DFS visit order', stdout: '0\n1\n3\n2' }],
  ),
  pg(
    'java-algo-bfs',
    'Practice: BFS',
    `Same graph as you would use for DFS: 0 connects to 1 then 2, 1 connects to 3. BFS from 0. Print each node when you first visit it.

Expected:

0
1
2
3`,
    `import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Queue;

public class Main {
    public static void main(String[] args) {
        ArrayList<ArrayList<Integer>> g = new ArrayList<ArrayList<Integer>>();
        g.add(new ArrayList<Integer>());
        g.add(new ArrayList<Integer>());
        g.add(new ArrayList<Integer>());
        g.add(new ArrayList<Integer>());
        g.get(0).add(1);
        g.get(0).add(2);
        g.get(1).add(3);
        boolean[] seen = new boolean[4];
        Queue<Integer> q = new ArrayDeque<Integer>();
        // BFS from 0, print visit order
    }
}
`,
    [{ name: 'BFS visit order', stdout: '0\n1\n2\n3' }],
  ),
  pg(
    'java-algo-backtracking',
    'Practice: backtracking',
    `Print every binary string of length 2, in this order:

00
01
10
11`,
    `public class Main {
    static void build(char[] cur, int i) {
        // if i == length, print cur as a String, else try '0' then '1'
    }

    public static void main(String[] args) {
        build(new char[2], 0);
    }
}
`,
    [{ name: 'Length 2', stdout: '00\n01\n10\n11' }],
  ),
  pg(
    'java-algo-memoization',
    'Practice: memoization',
    `Return the 6th Fibonacci number with fib(0)=0 and fib(1)=1. Print fib(6).

Expected:

8`,
    `public class Main {
    static int fib(int n) {
        return 0;
    }

    public static void main(String[] args) {
        System.out.println(fib(6));
    }
}
`,
    [{ name: 'fib(6)', stdout: '8' }],
  ),
  pg(
    'java-big-o',
    'Practice: same answer, different cost',
    `The obvious hasDuplicate is O(n squared) — for every element, walk the rest of
the array looking for a match. Write the O(n) version instead: one pass, with a
HashSet remembering what you have seen. Set.add returns false when the value was
already there, which is the whole test. main is written for you.

Expected:

false
true`,
    `import java.util.HashSet;
import java.util.Set;

public class Main {
    // TODO one pass over arr, using a HashSet<Integer> — no nested loop
    static boolean hasDuplicate(int[] arr) {
        return false;
    }

    public static void main(String[] args) {
        System.out.println(hasDuplicate(new int[] { 3, 9, 4, 7 }));
        System.out.println(hasDuplicate(new int[] { 3, 9, 4, 9 }));
    }
}
`,
    [{ name: 'Duplicates found', stdout: 'false\ntrue' }],
  ),
  pg(
    'java-algo-shortest-paths',
    'Practice: relax the edges',
    `dijkstra is written for you except for the relaxation step. Inside the loop over
edges, compute the candidate distance through u, and if it beats dist[e.to],
record it and offer the neighbour to the queue. main is written for you.

Expected:

[0.0, 2.0, 3.0, 5.0]`,
    `import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.PriorityQueue;

public class Main {
    record Edge(int to, double cost) {}

    static double[] dijkstra(List<List<Edge>> adj, int source) {
        double[] dist = new double[adj.size()];
        Arrays.fill(dist, Double.POSITIVE_INFINITY);
        dist[source] = 0.0;
        PriorityQueue<double[]> pq = new PriorityQueue<>((a, b) -> Double.compare(a[1], b[1]));
        pq.offer(new double[] { source, 0.0 });

        while (!pq.isEmpty()) {
            double[] top = pq.poll();
            int u = (int) top[0];
            if (top[1] > dist[u]) continue;
            for (Edge e : adj.get(u)) {
                // TODO relax: candidate = dist[u] + e.cost(); if it is better, store it and offer e.to()
            }
        }
        return dist;
    }

    public static void main(String[] args) {
        List<List<Edge>> adj = new ArrayList<>();
        for (int i = 0; i < 4; i++) adj.add(new ArrayList<>());
        int[][] edges = { { 0, 1, 2 }, { 0, 2, 5 }, { 1, 2, 1 }, { 1, 3, 6 }, { 2, 3, 2 } };
        for (int[] e : edges) {
            adj.get(e[0]).add(new Edge(e[1], e[2]));
            adj.get(e[1]).add(new Edge(e[0], e[2]));
        }
        System.out.println(Arrays.toString(dijkstra(adj, 0)));
    }
}
`,
    [{ name: 'Distances from node 0', stdout: '[0.0, 2.0, 3.0, 5.0]' }],
  ),
];
