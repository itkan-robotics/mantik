import { main, pg } from './helpers';
import type { JavaPlaygroundExercise } from '../types';

export const DATA_STRUCTURES: JavaPlaygroundExercise[] = [
  pg(
    'java-ds-arrays',
    'Practice: array order',
    `Print the array values from last index to first, each on its own line.

Expected:

9
7
3`,
    main(`        int[] values = {3, 7, 9};
        // print from the end to the start`),
    [{ name: 'Reverse order', stdout: '9\n7\n3' }],
  ),
  pg(
    'java-ds-arraylists',
    'Practice: ArrayList',
    `Add "intake", "arm", and "shooter" to the list. Print size, then the last element.

Expected:

3
shooter`,
    `import java.util.ArrayList;

public class Main {
    public static void main(String[] args) {
        ArrayList<String> parts = new ArrayList<String>();
        // add three strings, then print size and the last value
    }
}
`,
    [{ name: 'Size and last', stdout: '3\nshooter' }],
  ),
  pg(
    'java-ds-linked-lists',
    'Practice: linked list',
    `The starter builds 10 -> 20 -> 30. Walk from head and print each value.

Expected:

10
20
30`,
    `class Node {
    int value;
    Node next;

    Node(int value) {
        this.value = value;
    }
}

public class Main {
    public static void main(String[] args) {
        Node head = new Node(10);
        head.next = new Node(20);
        head.next.next = new Node(30);
        // walk from head and print each value
    }
}
`,
    [{ name: 'Walk the list', stdout: '10\n20\n30' }],
  ),
  pg(
    'java-ds-stacks',
    'Practice: stack',
    `Push 1, then 2, then 3 on an ArrayDeque used as a stack. Pop and print until empty (last in first).

Expected:

3
2
1`,
    `import java.util.ArrayDeque;
import java.util.Deque;

public class Main {
    public static void main(String[] args) {
        Deque<Integer> stack = new ArrayDeque<Integer>();
        // push 1, 2, 3 then pop and print
    }
}
`,
    [{ name: 'LIFO', stdout: '3\n2\n1' }],
  ),
  pg(
    'java-ds-queues',
    'Practice: queue',
    `Offer 1, then 2, then 3 on an ArrayDeque used as a Queue. Poll and print until empty (first in first).

Expected:

1
2
3`,
    `import java.util.ArrayDeque;
import java.util.Queue;

public class Main {
    public static void main(String[] args) {
        Queue<Integer> queue = new ArrayDeque<Integer>();
        // offer 1, 2, 3 then poll and print
    }
}
`,
    [{ name: 'FIFO', stdout: '1\n2\n3' }],
  ),
  pg(
    'java-ds-deques',
    'Practice: deque',
    `addFirst(1), then addLast(2). Print pollFirst, then pollLast.

Expected:

1
2`,
    `import java.util.ArrayDeque;
import java.util.Deque;

public class Main {
    public static void main(String[] args) {
        Deque<Integer> deque = new ArrayDeque<Integer>();
        // addFirst 1, addLast 2, then print pollFirst and pollLast
    }
}
`,
    [{ name: 'Both ends', stdout: '1\n2' }],
  ),
  pg(
    'java-ds-sets-maps',
    'Practice: map',
    `Put "kP" -> 4. Print get("kP"), then print getOrDefault("kI", 0) for a missing key.

Expected:

4
0`,
    `import java.util.HashMap;
import java.util.Map;

public class Main {
    public static void main(String[] args) {
        Map<String, Integer> gains = new HashMap<String, Integer>();
        // put kP, print it, then print getOrDefault for kI
    }
}
`,
    [{ name: 'Get and missing key', stdout: '4\n0' }],
  ),
  pg(
    'java-ds-trees',
    'Practice: binary tree',
    `Print an inorder walk of the starter tree (left, node, right).

Expected:

1
2
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
    static void inorder(Node node) {
        // left, print, right
    }

    public static void main(String[] args) {
        Node root = new Node(2);
        root.left = new Node(1);
        root.right = new Node(3);
        inorder(root);
    }
}
`,
    [{ name: 'Inorder', stdout: '1\n2\n3' }],
  ),
  pg(
    'java-ds-graphs',
    'Practice: adjacency list',
    `Print every neighbor of node 0, each on its own line.

Expected:

1
2`,
    `import java.util.ArrayList;

public class Main {
    public static void main(String[] args) {
        ArrayList<ArrayList<Integer>> g = new ArrayList<ArrayList<Integer>>();
        g.add(new ArrayList<Integer>());
        g.add(new ArrayList<Integer>());
        g.add(new ArrayList<Integer>());
        g.get(0).add(1);
        g.get(0).add(2);
        // print neighbors of 0
    }
}
`,
    [{ name: 'Neighbors of 0', stdout: '1\n2' }],
  ),
];
