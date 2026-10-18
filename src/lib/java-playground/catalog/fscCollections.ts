import type { JavaPlaygroundExercise } from '../types';

/**
 * Track 3 of the Practice Assignments, adapted from the FSC Open Docs Java
 * Assignments curriculum (CC BY-SA 4.0).
 *
 * Same shape as Track 2: each starter ships a fixed `main` that exercises the
 * types the student writes, so the checks compare output the student does not
 * control. `main` is off limits; everything above it is the assignment.
 *
 * Two constraints shape every expected output here:
 *
 *   - **Hash order is not output order.** `HashMap` and `HashSet` iterate in an
 *     order that is unspecified and has in fact changed between Java releases, so
 *     every `main` sorts before it prints. An assignment that printed a map
 *     directly would pass locally and fail in the browser for no reason the
 *     student could act on.
 *   - **Doubles print, they do not round.** `Double.toString` is specified
 *     exactly, so `47.0` is safe, but an average like `6.0 / 7` is not something
 *     to put in a check. Where an average is checked, `main` rounds it first.
 */
export const FSC_COLLECTIONS: JavaPlaygroundExercise[] = [
  {
    id: 'a23-ring-buffer',
    title: 'A23: Generic Ring Buffer',
    entryClass: 'RingBufferDemo',
    showStdin: false,
    prompt: `A ring buffer keeps the most recent N values and drops the rest. Writing it
generically means one implementation serves every sensor you own.

    RingBuffer<T>(capacity)   capacity >= 1, else IllegalArgumentException
        add(T)                O(1). When full, overwrite the oldest.
        oldest() / newest()   O(1). NoSuchElementException when empty.
        size() capacity() isEmpty() isFull() clear()
        oldestFirst()         Iterable<T>, oldest to newest
        newestFirst()         Iterable<T>, newest to oldest
        toString()            RingBuffer[1.0, 2.0, 3.0], oldest first

Back it with an Object[] and cast on the way out — new T[capacity] does not
compile, because the type parameter is erased before the array would be made.
main is written for you and exercises the class with two different type
arguments.`,
    starter: `import java.util.Iterator;
import java.util.List;
import java.util.NoSuchElementException;

// Author:
// Date:
// What this program does:

class RingBuffer<T> {

    // TODO fields: an Object[] holding the values, plus the index of the oldest
    //      element and the current count. No shifting, no copying on add.

    RingBuffer(int capacity) {
        // TODO reject capacity < 1 with IllegalArgumentException
    }

    // TODO append; when the buffer is full, overwrite the oldest instead of growing
    void add(T value) {
    }

    // TODO the oldest element, or NoSuchElementException when empty
    T oldest() {
        return null;
    }

    // TODO the newest element, or NoSuchElementException when empty
    T newest() {
        return null;
    }

    int size() {
        return 0;
    }

    int capacity() {
        return 0;
    }

    boolean isEmpty() {
        return true;
    }

    boolean isFull() {
        return false;
    }

    void clear() {
    }

    // TODO walk oldest -> newest
    Iterable<T> oldestFirst() {
        return List.of();
    }

    // TODO walk newest -> oldest
    Iterable<T> newestFirst() {
        return List.of();
    }

    // TODO RingBuffer[1.0, 2.0, 3.0] — oldest first, empty prints RingBuffer[]
    @Override
    public String toString() {
        return "TODO";
    }
}

public class RingBufferDemo {
    // Leave main as it is. Implement RingBuffer above.
    public static void main(String[] args) {
        RingBuffer<Double> volts = new RingBuffer<>(5);
        for (int i = 1; i <= 7; i++) {
            double v = i;
            volts.add(v);
            System.out.println("add " + v + " -> " + volts + " size=" + volts.size());
        }

        System.out.println("oldest=" + volts.oldest() + " newest=" + volts.newest());

        StringBuilder forward = new StringBuilder();
        for (double v : volts.oldestFirst()) {
            forward.append(v).append(" ");
        }
        System.out.println("oldestFirst: " + forward.toString().trim());

        StringBuilder backward = new StringBuilder();
        for (double v : volts.newestFirst()) {
            backward.append(v).append(" ");
        }
        System.out.println("newestFirst: " + backward.toString().trim());

        System.out.println("full=" + volts.isFull() + " empty=" + volts.isEmpty()
            + " capacity=" + volts.capacity() + " size=" + volts.size());

        RingBuffer<String> tags = new RingBuffer<>(3);
        for (String s : new String[] { "a", "b", "c", "d" }) {
            tags.add(s);
        }
        System.out.println("strings: " + tags);
        System.out.println("strings oldest=" + tags.oldest() + " newest=" + tags.newest());

        volts.clear();
        System.out.println("after clear: " + volts + " size=" + volts.size()
            + " empty=" + volts.isEmpty() + " capacity=" + volts.capacity());

        System.out.println("capacity 0 rejected: " + rejectsCapacity(0));
        System.out.println("capacity -3 rejected: " + rejectsCapacity(-3));
        System.out.println("empty oldest rejected: " + rejectsEmptyOldest());
        System.out.println("empty newest rejected: " + rejectsEmptyNewest());
    }

    static String rejectsCapacity(int capacity) {
        try {
            new RingBuffer<Double>(capacity);
            return "no";
        } catch (IllegalArgumentException e) {
            return "yes";
        }
    }

    static String rejectsEmptyOldest() {
        try {
            new RingBuffer<Double>(5).oldest();
            return "no";
        } catch (NoSuchElementException e) {
            return "yes";
        }
    }

    static String rejectsEmptyNewest() {
        try {
            new RingBuffer<Double>(5).newest();
            return "no";
        } catch (NoSuchElementException e) {
            return "yes";
        }
    }
}
`,
    tests: [
      {
        name: 'The buffer fills up without dropping anything',
        describe: 'The first five adds each grow the buffer, oldest value first',
        pattern:
          'add 1\\.0 -> RingBuffer\\[1\\.0\\] size=1\\nadd 2\\.0 -> RingBuffer\\[1\\.0, 2\\.0\\] size=2[\\s\\S]*add 5\\.0 -> RingBuffer\\[1\\.0, 2\\.0, 3\\.0, 4\\.0, 5\\.0\\] size=5',
      },
      {
        name: 'Adding past capacity drops the oldest, it does not grow',
        describe: 'Adds six and seven overwrite 1.0 and 2.0, and size stays at 5',
        pattern:
          'add 6\\.0 -> RingBuffer\\[2\\.0, 3\\.0, 4\\.0, 5\\.0, 6\\.0\\] size=5\\nadd 7\\.0 -> RingBuffer\\[3\\.0, 4\\.0, 5\\.0, 6\\.0, 7\\.0\\] size=5',
      },
      {
        name: 'oldest and newest survive the wrap',
        describe: 'After seven adds into a buffer of five, the ends are 3.0 and 7.0',
        pattern: 'oldest=3\\.0 newest=7\\.0',
      },
      {
        name: 'Both iterators walk in the direction they promise',
        describe: 'oldestFirst and newestFirst list the same five values in opposite orders',
        pattern:
          'oldestFirst: 3\\.0 4\\.0 5\\.0 6\\.0 7\\.0\\nnewestFirst: 7\\.0 6\\.0 5\\.0 4\\.0 3\\.0',
      },
      {
        name: 'The state queries agree with the contents',
        describe: 'A buffer holding five of five reports full, not empty, capacity 5',
        pattern: 'full=true empty=false capacity=5 size=5',
      },
      {
        name: 'The same class works for a second type argument',
        describe: 'A RingBuffer<String> of capacity 3 keeps the last three strings',
        pattern: 'strings: RingBuffer\\[b, c, d\\]\\nstrings oldest=b newest=d',
      },
      {
        name: 'clear empties the buffer without shrinking it',
        describe: 'After clear the buffer is empty and still has capacity 5',
        pattern: 'after clear: RingBuffer\\[\\] size=0 empty=true capacity=5',
      },
      {
        name: 'Bad capacity and empty reads are rejected',
        describe: 'Capacity 0 and -3 throw IllegalArgumentException; reading an empty buffer throws NoSuchElementException',
        pattern:
          'capacity 0 rejected: yes\\ncapacity -3 rejected: yes\\nempty oldest rejected: yes\\nempty newest rejected: yes',
      },
    ],
  },

  {
    id: 'a24-scouting-database',
    title: 'A24: Scouting Database',
    entryClass: 'ScoutingCLI',
    showStdin: true,
    prompt: `Arrays are fine when you know the size up front. Entries that arrive, get
filtered, get sorted and get deleted want a List.

    TeamEntry(teamNumber, teamName, drivetrain, avgPoints, climbsHigh)
        Compact constructor: team number 1 to 99999, name not blank,
        drivetrain one of TANK, MECANUM, SWERVE, OTHER, avgPoints >= 0.
        pickScore() = avgPoints + 25.0 when climbsHigh, else avgPoints.

    ScoutingDatabase wraps one ArrayList<TeamEntry>:
        add, removeByTeamNumber -> boolean, findByTeamNumber -> Optional,
        filter(Predicate<TeamEntry>), filterByDrivetrain, size, clear,
        sortedByPickScore() -> a sorted copy, descending, leaving the
        database untouched, and all() -> an unmodifiable view.

main is a menu loop, written for you. Each command is one line: the letter, then
its argument.

    l            list, in insertion order        s   sorted by pick score
    f 1339       find by team number             h   teams that climb high
    r 2468       remove by team number           u   check all() is unmodifiable
    d SWERVE     filter by drivetrain            q   quit
    a 5000,New Team,TANK,30.0,false              add one entry

Run needs input — paste commands into the box below, one per line, ending with q.`,
    starter: `import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.Scanner;
import java.util.function.Predicate;

// Author:
// Date:
// What this program does:

record TeamEntry(
    int teamNumber,
    String teamName,
    String drivetrain,
    double avgPoints,
    boolean climbsHigh
) {

    // TODO compact constructor: team number 1 to 99999, name not blank (trim it),
    //      drivetrain one of TANK / MECANUM / SWERVE / OTHER, avgPoints >= 0

    // TODO avgPoints, plus 25.0 when the team climbs high
    double pickScore() {
        return 0.0;
    }
}

class ScoutingDatabase {

    // TODO one private final ArrayList<TeamEntry> field

    void add(TeamEntry entry) {
    }

    // TODO true when something was removed. removeIf tells you this already.
    boolean removeByTeamNumber(int teamNumber) {
        return false;
    }

    // TODO Optional.empty() when absent — never null
    Optional<TeamEntry> findByTeamNumber(int teamNumber) {
        return Optional.empty();
    }

    // TODO the entries the predicate accepts, in insertion order
    List<TeamEntry> filter(Predicate<TeamEntry> test) {
        return List.of();
    }

    // TODO express this with filter rather than a second loop
    List<TeamEntry> filterByDrivetrain(String drivetrain) {
        return List.of();
    }

    // TODO a sorted copy, highest pick score first. Must not reorder the database.
    List<TeamEntry> sortedByPickScore() {
        return List.of();
    }

    int size() {
        return 0;
    }

    void clear() {
    }

    // TODO a read-only view of the entries — callers must not be able to mutate it
    List<TeamEntry> all() {
        return List.of();
    }
}

public class ScoutingCLI {
    // Leave main and its helpers as they are. Implement the two types above.
    public static void main(String[] args) {
        ScoutingDatabase db = new ScoutingDatabase();
        for (TeamEntry t : seed()) {
            db.add(t);
        }

        Scanner in = new Scanner(System.in);
        while (in.hasNextLine()) {
            String line = in.nextLine().trim();
            if (line.isEmpty()) {
                continue;
            }
            String command = line.substring(0, 1);
            String argument = line.length() > 1 ? line.substring(1).trim() : "";

            if (command.equals("q")) {
                System.out.println("bye");
                break;
            } else if (command.equals("l")) {
                print("list", db.all());
            } else if (command.equals("s")) {
                print("sorted by pick score", db.sortedByPickScore());
            } else if (command.equals("h")) {
                print("high climb", db.filter(t -> t.climbsHigh()));
            } else if (command.equals("d")) {
                print(argument, db.filterByDrivetrain(argument));
            } else if (command.equals("f")) {
                int number = Integer.parseInt(argument);
                System.out.println(db.findByTeamNumber(number)
                    .map(t -> "found " + show(t))
                    .orElse("no team " + number));
            } else if (command.equals("r")) {
                int number = Integer.parseInt(argument);
                System.out.println(db.removeByTeamNumber(number)
                    ? "removed " + number
                    : "no team " + number);
            } else if (command.equals("u")) {
                System.out.println("all() is unmodifiable: " + unmodifiable(db));
            } else if (command.equals("a")) {
                System.out.println(addFrom(db, argument));
            } else {
                System.out.println("unknown command " + command);
            }
        }
        in.close();
    }

    static List<TeamEntry> seed() {
        return List.of(
            new TeamEntry(1234, "Example Robotics", "SWERVE", 45.5, true),
            new TeamEntry(2468, "Gear Grinders", "TANK", 38.0, false),
            new TeamEntry(1339, "Mech Warriors", "SWERVE", 52.25, true),
            new TeamEntry(3476, "Code Orange", "SWERVE", 61.0, false),
            new TeamEntry(4451, "ROBOTOLOGY", "MECANUM", 29.75, true),
            new TeamEntry(5190, "Green Machine", "TANK", 47.0, false)
        );
    }

    static String show(TeamEntry t) {
        return t.teamNumber() + " " + t.teamName() + " " + t.drivetrain()
            + " " + t.avgPoints() + (t.climbsHigh() ? " climb" : "");
    }

    static void print(String label, List<TeamEntry> entries) {
        System.out.println(label + " (" + entries.size() + ")");
        for (TeamEntry t : entries) {
            System.out.println("  " + show(t));
        }
    }

    static String addFrom(ScoutingDatabase db, String csv) {
        String[] parts = csv.split(",");
        try {
            TeamEntry entry = new TeamEntry(
                Integer.parseInt(parts[0].trim()),
                parts[1].trim(),
                parts[2].trim(),
                Double.parseDouble(parts[3].trim()),
                Boolean.parseBoolean(parts[4].trim()));
            db.add(entry);
            return "added " + entry.teamNumber();
        } catch (IllegalArgumentException e) {
            return "rejected: " + e.getMessage();
        }
    }

    static String unmodifiable(ScoutingDatabase db) {
        try {
            db.all().add(new TeamEntry(9999, "Intruder", "OTHER", 1.0, false));
            return "no";
        } catch (UnsupportedOperationException e) {
            return "yes";
        }
    }
}
`,
    tests: [
      {
        name: 'The list keeps insertion order',
        stdin: 'l\nq\n',
        describe: 'All six seeded teams, in the order they were added',
        pattern:
          'list \\(6\\)\\n  1234 Example Robotics SWERVE 45\\.5 climb\\n  2468 Gear Grinders TANK 38\\.0\\n  1339 Mech Warriors SWERVE 52\\.25 climb\\n  3476 Code Orange SWERVE 61\\.0\\n  4451 ROBOTOLOGY MECANUM 29\\.75 climb\\n  5190 Green Machine TANK 47\\.0\\nbye',
      },
      {
        name: 'Sorting ranks by pick score and leaves the database alone',
        stdin: 's\nl\nq\n',
        describe:
          'Sorted gives 1339, 1234, 3476, 4451, 5190, 2468; the list straight after is still in insertion order',
        pattern:
          'sorted by pick score \\(6\\)\\n  1339 [^\\n]*\\n  1234 [^\\n]*\\n  3476 [^\\n]*\\n  4451 [^\\n]*\\n  5190 [^\\n]*\\n  2468 [^\\n]*\\nlist \\(6\\)\\n  1234 ',
      },
      {
        name: 'Find answers with an Optional either way',
        stdin: 'f 1339\nf 9999\nq\n',
        describe: 'A hit prints the entry; a miss prints "no team 9999" instead of crashing',
        pattern: 'found 1339 Mech Warriors SWERVE 52\\.25 climb\\nno team 9999',
      },
      {
        name: 'Remove reports whether it removed anything',
        stdin: 'r 2468\nr 2468\nl\nq\n',
        describe: 'The first remove succeeds, the second finds nothing, and the list is down to five',
        pattern: 'removed 2468\\nno team 2468\\nlist \\(5\\)',
      },
      {
        name: 'Filtering by drivetrain finds all of them, or none',
        stdin: 'd SWERVE\nd TANK\nd HOVER\nq\n',
        describe: 'Three SWERVE teams, two TANK, and an empty result for a drivetrain nobody runs',
        pattern:
          'SWERVE \\(3\\)\\n  1234 [^\\n]*\\n  1339 [^\\n]*\\n  3476 [^\\n]*\\nTANK \\(2\\)\\n  2468 [^\\n]*\\n  5190 [^\\n]*\\nHOVER \\(0\\)\\nbye',
      },
      {
        name: 'A lambda predicate reaches the same list',
        stdin: 'h\nq\n',
        describe: 'The three teams whose climbsHigh is true',
        pattern: 'high climb \\(3\\)\\n  1234 [^\\n]*\\n  1339 [^\\n]*\\n  4451 [^\\n]*\\nbye',
      },
      {
        name: 'Adding goes through the compact constructor',
        stdin: 'a 5000,New Team,TANK,30.0,false\nl\na 0,Bad Number,TANK,10.0,false\na 7000,Bad Drive,HOVER,10.0,false\nq\n',
        describe:
          'A valid row is added and shows up in the list; a zero team number and an unknown drivetrain are both rejected',
        pattern:
          'added 5000\\nlist \\(7\\)[\\s\\S]*  5000 New Team TANK 30\\.0\\nrejected: [^\\n]+\\nrejected: [^\\n]+',
      },
      {
        name: 'all() hands back a view callers cannot write to',
        stdin: 'u\nl\nq\n',
        describe: 'Adding through all() throws UnsupportedOperationException, and the database still holds six',
        pattern: 'all\\(\\) is unmodifiable: yes\\nlist \\(6\\)',
      },
    ],
  },

  {
    id: 'a25-alliance-lookup',
    title: 'A25: Alliance Lookup',
    entryClass: 'MapLookupDemo',
    showStdin: false,
    prompt: `A list answers "give me everyone" well and "who is team 1339?" badly. Keyed
data wants a Map — and the moment the key is a type you wrote, the equals and
hashCode contract stops being trivia.

    MatchKey(matchNumber, alliance)   compact constructor: alliance must be
                                      RED or BLUE, stored upper case
    MatchOutcome(score, won)

    AllianceData holds three maps:
        Map<Integer, TeamEntry>        by team number
        Map<String, List<Integer>>     drivetrain -> team numbers
        Map<MatchKey, MatchOutcome>    keyed by a record you wrote

        addTeam        updates both team maps
        recordOutcome(matchNumber, alliance, score, won)
        getTeam / outcomeFor            Optional, never null
        teamsWith(drivetrain)           empty list, never null
        countByDrivetrain()             a fresh map, drivetrain -> count
        averageScore()                  0.0 when nothing has been recorded

main is written for you. It prints the maps in sorted order on purpose: hash
order is unspecified and has changed between Java releases, so a program that
prints a HashMap directly is a program whose output you cannot check.`,
    starter: `import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

// Author:
// Date:
// What this program does:

record TeamEntry(int teamNumber, String teamName, String drivetrain) {
}

record MatchOutcome(int score, boolean won) {
}

record MatchKey(int matchNumber, String alliance) {

    // TODO compact constructor: alliance must be RED or BLUE in any case, and is
    //      stored upper case. Anything else is an IllegalArgumentException.
}

class AllianceData {

    // TODO three private final maps — by team number, by drivetrain, by MatchKey

    // TODO update teamsByNumber AND append to the right drivetrain list
    void addTeam(TeamEntry t) {
    }

    // TODO build a MatchKey and store the outcome under it
    void recordOutcome(int matchNumber, String alliance, int score, boolean won) {
    }

    Optional<TeamEntry> getTeam(int number) {
        return Optional.empty();
    }

    // TODO the teams with that drivetrain, in the order they were added
    List<TeamEntry> teamsWith(String drivetrain) {
        return List.of();
    }

    Optional<MatchOutcome> outcomeFor(int matchNumber, String alliance) {
        return Optional.empty();
    }

    // TODO a fresh map: drivetrain -> how many teams run it
    Map<String, Integer> countByDrivetrain() {
        return Map.of();
    }

    // TODO the mean of every recorded score, or 0.0 when there are none
    double averageScore() {
        return 0.0;
    }
}

public class MapLookupDemo {
    // Leave main as it is. Implement MatchKey and AllianceData above.
    public static void main(String[] args) {
        AllianceData data = new AllianceData();
        data.addTeam(new TeamEntry(1234, "Example Robotics", "SWERVE"));
        data.addTeam(new TeamEntry(2468, "Gear Grinders", "TANK"));
        data.addTeam(new TeamEntry(1339, "Mech Warriors", "SWERVE"));
        data.addTeam(new TeamEntry(3476, "Code Orange", "SWERVE"));
        data.addTeam(new TeamEntry(4451, "ROBOTOLOGY", "MECANUM"));
        data.addTeam(new TeamEntry(5190, "Green Machine", "TANK"));
        data.addTeam(new TeamEntry(6328, "Mechanical Advantage", "OTHER"));

        data.recordOutcome(1, "RED", 45, true);
        data.recordOutcome(1, "BLUE", 38, false);
        data.recordOutcome(2, "RED", 52, true);
        data.recordOutcome(3, "RED", 61, false);
        data.recordOutcome(3, "BLUE", 70, true);
        data.recordOutcome(4, "BLUE", 28, false);

        System.out.println("team 1234: " + data.getTeam(1234).map(Object::toString).orElse("empty"));
        System.out.println("team 9999: " + data.getTeam(9999).map(Object::toString).orElse("empty"));

        System.out.println("swerve teams: " + numbersOf(data.teamsWith("SWERVE")));
        System.out.println("tank teams: " + numbersOf(data.teamsWith("TANK")));
        System.out.println("hover teams: " + numbersOf(data.teamsWith("HOVER")));

        System.out.println("match 3 RED: " + data.outcomeFor(3, "RED").map(Object::toString).orElse("empty"));
        System.out.println("match 3 red: " + data.outcomeFor(3, "red").map(Object::toString).orElse("empty"));
        System.out.println("match 9 RED: " + data.outcomeFor(9, "RED").map(Object::toString).orElse("empty"));

        System.out.println("countByDrivetrain:");
        Map<String, Integer> counts = data.countByDrivetrain();
        List<String> keys = new ArrayList<>(counts.keySet());
        Collections.sort(keys);
        for (String key : keys) {
            System.out.println("  " + key + " " + counts.get(key));
        }

        System.out.println("averageScore: " + data.averageScore());
        System.out.println("empty averageScore: " + new AllianceData().averageScore());

        MatchKey key1 = new MatchKey(3, "RED");
        MatchKey key2 = new MatchKey(3, "red");
        System.out.println("key1 == key2: " + (key1 == key2));
        System.out.println("key1.equals(key2): " + key1.equals(key2));
        System.out.println("hashCodes equal: " + (key1.hashCode() == key2.hashCode()));
        System.out.println("alliance normalised: " + key2.alliance());
        System.out.println("bad alliance rejected: " + rejectsAlliance("GREEN"));
    }

    static List<Integer> numbersOf(List<TeamEntry> teams) {
        List<Integer> numbers = new ArrayList<>();
        for (TeamEntry t : teams) {
            numbers.add(t.teamNumber());
        }
        return numbers;
    }

    static String rejectsAlliance(String alliance) {
        try {
            new MatchKey(1, alliance);
            return "no";
        } catch (IllegalArgumentException e) {
            return "yes";
        }
    }
}
`,
    tests: [
      {
        name: 'Lookup by team number answers both ways',
        describe: 'A present team prints its record; a missing one prints "empty", not null',
        pattern:
          'team 1234: TeamEntry\\[teamNumber=1234, teamName=Example Robotics, drivetrain=SWERVE\\]\\nteam 9999: empty',
      },
      {
        name: 'The drivetrain index stays in sync with the team map',
        describe: 'Three SWERVE teams and two TANK, in the order they were added, and an empty list for HOVER',
        pattern:
          'swerve teams: \\[1234, 1339, 3476\\]\\ntank teams: \\[2468, 5190\\]\\nhover teams: \\[\\]',
      },
      {
        name: 'A record key looks up the same value however it was built',
        describe: 'Match 3 RED is found whether the alliance was spelled RED or red',
        pattern:
          'match 3 RED: MatchOutcome\\[score=61, won=false\\]\\nmatch 3 red: MatchOutcome\\[score=61, won=false\\]\\nmatch 9 RED: empty',
      },
      {
        name: 'Counting by drivetrain covers every team once',
        describe: 'MECANUM 1, OTHER 1, SWERVE 3, TANK 2 — seven teams in total',
        pattern:
          'countByDrivetrain:\\n  MECANUM 1\\n  OTHER 1\\n  SWERVE 3\\n  TANK 2',
      },
      {
        name: 'An empty database averages to zero rather than NaN',
        describe: 'The six recorded scores average 49.0, and a fresh AllianceData averages 0.0',
        pattern: 'averageScore: 49\\.0\\nempty averageScore: 0\\.0',
      },
      {
        name: 'The equals and hashCode contract holds for the key',
        describe:
          'Two separately built keys are different objects, compare equal, hash the same, and normalise the alliance',
        pattern:
          'key1 == key2: false\\nkey1\\.equals\\(key2\\): true\\nhashCodes equal: true\\nalliance normalised: RED',
      },
      {
        name: 'The compact constructor rejects an alliance that is neither',
        describe: 'A MatchKey for GREEN throws IllegalArgumentException',
        pattern: 'bad alliance rejected: yes',
      },
    ],
  },

  {
    id: 'a26-stream-filter',
    title: 'A26: Stream Filter',
    entryClass: 'StreamQueries',
    showStdin: false,
    prompt: `Five questions about a season of scouting data, each answered twice: once as a
stream pipeline, once as a plain loop. Writing both is the assignment — you are
meant to feel where a stream earns its keep and where it does not.

    swerveTeams(list)                 the SWERVE teams, in list order
    topKByPickScore(list, k)          the k highest pick scores, descending
    avgClimbByDrivetrain(list)        drivetrain -> mean climb rate
    anyTeamOver(list, threshold)      does anyone average more than this?
    firstMatching(list, predicate)    Optional of the first team that matches

Each has a ...Stream and a ...Loop version with the same return type. Every
stream version should be a single expression, from list.stream() to the terminal
operation. Every loop version must short-circuit wherever its stream twin does —
anyMatch stops at the first hit, and so should your loop.

main compares the two versions of each query and prints whether they agree.
pickScore() is avgPoints plus 25 times climbRate.`,
    starter: `import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.TreeMap;
import java.util.function.Predicate;
import java.util.stream.Collectors;

// Author:
// Date:
// What this program does:

record TeamEntry(
    int teamNumber,
    String teamName,
    String drivetrain,
    double avgPoints,
    double climbRate
) {
    double pickScore() {
        return avgPoints + climbRate * 25.0;
    }
}

public class StreamQueries {

    // ---- the five queries, twice each -------------------------------------

    // TODO one expression: filter, then toList
    static List<TeamEntry> swerveTeamsStream(List<TeamEntry> teams) {
        return List.of();
    }

    static List<TeamEntry> swerveTeamsLoop(List<TeamEntry> teams) {
        return List.of();
    }

    // TODO one expression: sorted by pick score descending, then limit, then toList
    static List<TeamEntry> topKByPickScoreStream(List<TeamEntry> teams, int k) {
        return List.of();
    }

    static List<TeamEntry> topKByPickScoreLoop(List<TeamEntry> teams, int k) {
        return List.of();
    }

    // TODO one expression: Collectors.groupingBy with an averaging downstream
    static Map<String, Double> avgClimbByDrivetrainStream(List<TeamEntry> teams) {
        return Map.of();
    }

    static Map<String, Double> avgClimbByDrivetrainLoop(List<TeamEntry> teams) {
        return Map.of();
    }

    // TODO one expression, and it must stop at the first match — so must the loop
    static boolean anyTeamOverStream(List<TeamEntry> teams, double threshold) {
        return false;
    }

    static boolean anyTeamOverLoop(List<TeamEntry> teams, double threshold) {
        return false;
    }

    // TODO one expression ending in findFirst. The loop returns Optional too.
    static Optional<TeamEntry> firstMatchingStream(List<TeamEntry> teams, Predicate<TeamEntry> test) {
        return Optional.empty();
    }

    static Optional<TeamEntry> firstMatchingLoop(List<TeamEntry> teams, Predicate<TeamEntry> test) {
        return Optional.empty();
    }

    // ---- main and its helpers are written for you -------------------------

    public static void main(String[] args) {
        List<TeamEntry> teams = sample();

        List<TeamEntry> swerveStream = swerveTeamsStream(teams);
        List<TeamEntry> swerveLoop = swerveTeamsLoop(teams);
        System.out.println("swerve stream: " + numbersOf(swerveStream));
        System.out.println("swerve loop: " + numbersOf(swerveLoop));
        System.out.println("swerve agree: " + numbersOf(swerveStream).equals(numbersOf(swerveLoop)));

        List<TeamEntry> topStream = topKByPickScoreStream(teams, 5);
        List<TeamEntry> topLoop = topKByPickScoreLoop(teams, 5);
        System.out.println("top5 stream: " + numbersOf(topStream));
        System.out.println("top5 loop: " + numbersOf(topLoop));
        System.out.println("top5 agree: " + numbersOf(topStream).equals(numbersOf(topLoop)));

        System.out.println("top20 size stream: " + topKByPickScoreStream(teams, 20).size()
            + " loop: " + topKByPickScoreLoop(teams, 20).size());
        System.out.println("top0 size stream: " + topKByPickScoreStream(teams, 0).size()
            + " loop: " + topKByPickScoreLoop(teams, 0).size());

        Map<String, Double> avgStream = avgClimbByDrivetrainStream(teams);
        Map<String, Double> avgLoop = avgClimbByDrivetrainLoop(teams);
        System.out.println("avgClimb stream:");
        for (Map.Entry<String, Double> e : rounded(avgStream).entrySet()) {
            System.out.println("  " + e.getKey() + " " + e.getValue());
        }
        System.out.println("avgClimb agree: " + rounded(avgStream).equals(rounded(avgLoop)));

        System.out.println("anyOver 80.0 stream: " + anyTeamOverStream(teams, 80.0)
            + " loop: " + anyTeamOverLoop(teams, 80.0));
        System.out.println("anyOver 200.0 stream: " + anyTeamOverStream(teams, 200.0)
            + " loop: " + anyTeamOverLoop(teams, 200.0));
        System.out.println("anyOver on empty stream: " + anyTeamOverStream(List.of(), 0.0)
            + " loop: " + anyTeamOverLoop(List.of(), 0.0));

        Predicate<TeamEntry> isOther = t -> t.drivetrain().equals("OTHER");
        Predicate<TeamEntry> impossible = t -> t.avgPoints() > 500.0;
        System.out.println("firstOTHER stream: " + numberOr(firstMatchingStream(teams, isOther))
            + " loop: " + numberOr(firstMatchingLoop(teams, isOther)));
        System.out.println("firstMissing stream: " + numberOr(firstMatchingStream(teams, impossible))
            + " loop: " + numberOr(firstMatchingLoop(teams, impossible)));
    }

    static List<TeamEntry> sample() {
        return List.of(
            new TeamEntry(1234, "Example Robotics", "SWERVE", 45.5, 0.80),
            new TeamEntry(2468, "Gear Grinders", "TANK", 38.0, 0.40),
            new TeamEntry(1339, "Mech Warriors", "SWERVE", 52.25, 0.60),
            new TeamEntry(3476, "Code Orange", "SWERVE", 61.0, 0.90),
            new TeamEntry(4451, "ROBOTOLOGY", "MECANUM", 29.75, 0.20),
            new TeamEntry(5190, "Green Machine", "TANK", 47.0, 0.50),
            new TeamEntry(6328, "Mechanical Advantage", "SWERVE", 82.0, 0.95),
            new TeamEntry(1678, "Citrus Circuits", "SWERVE", 78.5, 0.85),
            new TeamEntry(254, "Cheesy Poofs", "SWERVE", 88.0, 1.00),
            new TeamEntry(118, "Robonauts", "OTHER", 71.0, 0.70),
            new TeamEntry(33, "Killer Bees", "TANK", 47.0, 0.50),
            new TeamEntry(2056, "OP Robotics", "SWERVE", 85.0, 0.90)
        );
    }

    static List<Integer> numbersOf(List<TeamEntry> teams) {
        List<Integer> numbers = new ArrayList<>();
        for (TeamEntry t : teams) {
            numbers.add(t.teamNumber());
        }
        return numbers;
    }

    static String numberOr(Optional<TeamEntry> found) {
        return found.map(t -> String.valueOf(t.teamNumber())).orElse("empty");
    }

    /** Averages are compared at three decimals: 6.0 / 7 is not a literal to check. */
    static Map<String, Double> rounded(Map<String, Double> raw) {
        Map<String, Double> out = new TreeMap<>();
        for (Map.Entry<String, Double> e : raw.entrySet()) {
            out.put(e.getKey(), Math.round(e.getValue() * 1000.0) / 1000.0);
        }
        return out;
    }
}
`,
    tests: [
      {
        name: 'Both filters find the same seven teams in the same order',
        describe: 'The SWERVE teams, in the order they appear in the list, from both versions',
        pattern:
          'swerve stream: \\[1234, 1339, 3476, 6328, 1678, 254, 2056\\]\\nswerve loop: \\[1234, 1339, 3476, 6328, 1678, 254, 2056\\]\\nswerve agree: true',
      },
      {
        name: 'Top-K ranks by pick score, not by average alone',
        describe: '254, 2056, 6328, 1678 and 118 — note that 118 outranks 3476 on climb rate',
        pattern:
          'top5 stream: \\[254, 2056, 6328, 1678, 118\\]\\ntop5 loop: \\[254, 2056, 6328, 1678, 118\\]\\ntop5 agree: true',
      },
      {
        name: 'Top-K never returns more than the list holds, or fewer than zero',
        describe: 'k=20 gives all 12 entries and k=0 gives none, from both versions',
        pattern: 'top20 size stream: 12 loop: 12\\ntop0 size stream: 0 loop: 0',
      },
      {
        name: 'Grouping averages each drivetrain separately',
        describe: 'MECANUM 0.2, OTHER 0.7, SWERVE 0.857, TANK 0.467 — and the loop version agrees',
        pattern:
          'avgClimb stream:\\n  MECANUM 0\\.2\\n  OTHER 0\\.7\\n  SWERVE 0\\.857\\n  TANK 0\\.467\\navgClimb agree: true',
      },
      {
        name: 'anyTeamOver answers true, false, and false on empty',
        describe: 'Someone averages over 80, nobody averages over 200, and an empty list matches nothing',
        pattern:
          'anyOver 80\\.0 stream: true loop: true\\nanyOver 200\\.0 stream: false loop: false\\nanyOver on empty stream: false loop: false',
      },
      {
        name: 'firstMatching returns an Optional, empty when nothing matches',
        describe: 'The first OTHER team is 118; a predicate nothing satisfies gives empty, not null',
        pattern:
          'firstOTHER stream: 118 loop: 118\\nfirstMissing stream: empty loop: empty',
      },
    ],
  },

  {
    id: 'a27-recursion-warmups',
    title: 'A27: Recursion Warmups',
    entryClass: 'RecursionWarmups',
    showStdin: false,
    prompt: `Five small recursive methods. Each is short; the point is the shape — a base
case that stops, and a recursive case that moves toward it. No loops in any of
the bodies.

    factorial(n)              n!, 1 for n <= 1, IllegalArgumentException for n < 0
    sum(arr, from)            arr[from..end], 0 when from == arr.length
    reverse(s)                "" for the empty string
    powerSlow(base, exp)      1 when exp == 0, IllegalArgumentException for exp < 0
    powerFast(base, exp)      same answer, halving the exponent:
                                  even -> (base * base) ^ (exp / 2)
                                  odd  -> base * base ^ (exp - 1)
    binarySearch(arr, target, low, high)
                              -1 when low > high; the wrapper passes 0 and length - 1

Increment slowCalls and fastCalls at the top of the two power methods. main
prints both counts so you can see the difference the halving makes; it is the
whole reason powerFast exists.`,
    starter: `// Author:
// Date:
// What this program does:

public class RecursionWarmups {

    static int slowCalls = 0;
    static int fastCalls = 0;

    // TODO base case n <= 1 returns 1; reject n < 0
    static long factorial(int n) {
        return 0;
    }

    // TODO base case from == arr.length returns 0
    static int sum(int[] arr, int from) {
        return 0;
    }

    // TODO base case "" returns ""; peel off the first character and trust the rest
    static String reverse(String s) {
        return "";
    }

    // TODO count the call, then base case exp == 0 returns 1; reject exp < 0
    static double powerSlow(double base, int exp) {
        return 0.0;
    }

    // TODO count the call, then halve the exponent when it is even
    static double powerFast(double base, int exp) {
        return 0.0;
    }

    // TODO two base cases: low > high returns -1, arr[mid] == target returns mid
    static int binarySearch(int[] sorted, int target, int low, int high) {
        return -1;
    }

    static int binarySearch(int[] sorted, int target) {
        return binarySearch(sorted, target, 0, sorted.length - 1);
    }

    // ---- main is written for you ------------------------------------------

    public static void main(String[] args) {
        System.out.println("factorial 0 = " + factorial(0));
        System.out.println("factorial 1 = " + factorial(1));
        System.out.println("factorial 5 = " + factorial(5));
        System.out.println("factorial 10 = " + factorial(10));
        System.out.println("factorial -1 rejected: " + rejectsFactorial(-1));

        System.out.println("sum empty = " + sum(new int[0], 0));
        System.out.println("sum single = " + sum(new int[] { 5 }, 0));
        System.out.println("sum 1..5 = " + sum(new int[] { 1, 2, 3, 4, 5 }, 0));
        System.out.println("sum mixed = " + sum(new int[] { -3, 3, -3, 3 }, 0));

        System.out.println("reverse HELLO -> " + reverse("HELLO"));
        System.out.println("reverse ABC -> " + reverse("ABC"));
        System.out.println("reverse A -> " + reverse("A"));
        System.out.println("reverse of empty is empty: " + reverse("").isEmpty());

        slowCalls = 0;
        double slow = powerSlow(2.0, 10);
        int slowUsed = slowCalls;
        fastCalls = 0;
        double fast = powerFast(2.0, 10);
        int fastUsed = fastCalls;

        System.out.println("powerSlow 2.0^10 = " + slow);
        System.out.println("powerFast 2.0^10 = " + fast);
        System.out.println("powerSlow calls=" + slowUsed + " powerFast calls=" + fastUsed);
        System.out.println("powerFast uses fewer calls: " + (fastUsed < slowUsed));
        System.out.println("both agree across nine pairs: " + powersAgree());
        System.out.println("power 2.0^0 = " + powerSlow(2.0, 0));
        System.out.println("power negative exponent rejected: " + rejectsPower(-1));

        int[] sorted = { 2, 5, 8, 12, 16, 23, 38, 56, 72 };
        System.out.println("binarySearch first = " + binarySearch(sorted, 2));
        System.out.println("binarySearch middle = " + binarySearch(sorted, 16));
        System.out.println("binarySearch last = " + binarySearch(sorted, 72));
        System.out.println("binarySearch absent = " + binarySearch(sorted, 40));
        System.out.println("binarySearch empty = " + binarySearch(new int[0], 1));
        System.out.println("binarySearch single hit = " + binarySearch(new int[] { 7 }, 7));
        System.out.println("binarySearch single miss = " + binarySearch(new int[] { 7 }, 9));
    }

    static boolean powersAgree() {
        double[][] pairs = {
            { 2.0, 0 }, { 2.0, 1 }, { 2.0, 10 }, { 3.0, 5 }, { 1.5, 4 },
            { 10.0, 3 }, { 0.5, 6 }, { 7.0, 2 }, { 2.0, 15 }
        };
        for (double[] pair : pairs) {
            int exp = (int) pair[1];
            if (Math.abs(powerSlow(pair[0], exp) - powerFast(pair[0], exp)) > 1e-9) {
                return false;
            }
        }
        return true;
    }

    static String rejectsFactorial(int n) {
        try {
            factorial(n);
            return "no";
        } catch (IllegalArgumentException e) {
            return "yes";
        }
    }

    static String rejectsPower(int exp) {
        try {
            powerSlow(2.0, exp);
            return "no";
        } catch (IllegalArgumentException e) {
            return "yes";
        }
    }
}
`,
    tests: [
      {
        name: 'factorial stops at the base case and rejects negatives',
        describe: '0 and 1 give 1, 5 gives 120, 10 gives 3628800, and -1 throws IllegalArgumentException',
        pattern:
          'factorial 0 = 1\\nfactorial 1 = 1\\nfactorial 5 = 120\\nfactorial 10 = 3628800\\nfactorial -1 rejected: yes',
      },
      {
        name: 'sum walks to the end of the array and stops',
        describe: 'An empty array sums to 0, and the recursion handles one, five and mixed-sign elements',
        pattern: 'sum empty = 0\\nsum single = 5\\nsum 1\\.\\.5 = 15\\nsum mixed = 0',
      },
      {
        name: 'reverse peels one character at a time',
        describe: 'HELLO reverses to OLLEH, a single character is itself, and the empty string is the base case',
        pattern:
          'reverse HELLO -> OLLEH\\nreverse ABC -> CBA\\nreverse A -> A\\nreverse of empty is empty: true',
      },
      {
        name: 'Both power versions get the same answer',
        describe: '2.0^10 is 1024.0 from either method, and they agree across nine more pairs',
        pattern:
          'powerSlow 2\\.0\\^10 = 1024\\.0\\npowerFast 2\\.0\\^10 = 1024\\.0[\\s\\S]*both agree across nine pairs: true',
      },
      {
        name: 'Halving the exponent really does cut the call count',
        describe: 'powerFast reaches the same answer in fewer calls than powerSlow',
        pattern: 'powerFast uses fewer calls: true',
      },
      {
        name: 'Exponent zero is the base case, negative is an error',
        describe: 'Anything to the zero is 1.0, and a negative exponent throws IllegalArgumentException',
        pattern: 'power 2\\.0\\^0 = 1\\.0\\npower negative exponent rejected: yes',
      },
      {
        name: 'binarySearch finds the ends as readily as the middle',
        describe: 'Targets at index 0, 4 and 8 are all found, and an absent target gives -1',
        pattern:
          'binarySearch first = 0\\nbinarySearch middle = 4\\nbinarySearch last = 8\\nbinarySearch absent = -1',
      },
      {
        name: 'binarySearch survives an empty and a one-element array',
        describe: 'Searching nothing gives -1; a single element is found at 0 and missed at -1',
        pattern:
          'binarySearch empty = -1\\nbinarySearch single hit = 0\\nbinarySearch single miss = -1',
      },
    ],
  },

  {
    id: 'a28-big-o-reading',
    title: 'A28: Big-O Reading',
    entryClass: 'BigOReading',
    showStdin: false,
    prompt: `This one is mostly a reading assignment, and the reading happens on the page:
ten snippets, each of which you tag with its complexity and a one-line reason.
Nothing here checks your tags — that is yours to get right, and the page lists
them all.

What the editor checks is the part where a tag turns into a decision. Snippet j
calls List.contains inside a loop, which makes it quadratic. Rewrite it:

    jFast(arr)        the distinct values, first-occurrence order, using a
                      HashSet for the membership test instead of a List
    median(samples)   the median of the samples — the mean of the middle two
                      when the count is even — WITHOUT reordering the caller's
                      array. Timing noise is why you take a median at all.

main then times three snippets at three sizes using your median. The ratios are
the lesson: doubling n should roughly double an O(n) time and quadruple an
O(n squared) one. In the browser the numbers are noisier than they are locally,
so read the shape, not the digits.`,
    starter: `import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

// Author:
// Date:
// What this program does:

public class BigOReading {

    // ---- the ten snippets to tag ------------------------------------------
    // Write your tag above each one: the complexity in terms of n, one sentence
    // of reasoning, and whether best / average / worst differ.

    // TAG:
    static int a(int[] arr) {
        return arr[0] + arr[arr.length - 1];
    }

    // TAG:
    static int b(int[] arr) {
        int sum = 0;
        for (int x : arr) sum += x;
        return sum;
    }

    // TAG:
    static int c(int[] arr, int target) {
        for (int x : arr) {
            if (x == target) return x;
        }
        return -1;
    }

    // TAG:
    static void d(int[] arr) {
        for (int i = 0; i < arr.length; i++)
            for (int j = 0; j < arr.length; j++)
                arr[i] += arr[j];
    }

    // TAG:
    static void e(int[] arr) {
        for (int i = 0; i < arr.length; i++)
            for (int j = i + 1; j < arr.length; j++)
                arr[i] += arr[j];
    }

    // TAG:
    static int f(int n) {
        int count = 0;
        while (n > 1) {
            n /= 2;
            count++;
        }
        return count;
    }

    // TAG:
    static int g(int[] sorted, int target) {
        int lo = 0, hi = sorted.length - 1;
        while (lo <= hi) {
            int mid = lo + (hi - lo) / 2;
            if (sorted[mid] == target) return mid;
            if (sorted[mid] < target) lo = mid + 1;
            else hi = mid - 1;
        }
        return -1;
    }

    // TAG:
    static int h(int n) {
        if (n <= 1) return n;
        return h(n - 1) + h(n - 2);
    }

    // TAG:
    static int i(int n) {
        int total = 0;
        for (int k = 0; k < n; k++)
            for (int j = 1; j < n; j *= 2)
                total++;
        return total;
    }

    // TAG:
    static List<Integer> j(int[] arr) {
        List<Integer> result = new ArrayList<>();
        for (int x : arr) {
            if (!result.contains(x)) result.add(x);
        }
        return result;
    }

    // ---- your turn --------------------------------------------------------

    // TODO the same answer as j, in the same order, with a HashSet doing the
    //      membership test so the whole thing is linear
    static List<Integer> jFast(int[] arr) {
        return List.of();
    }

    // TODO the median of samples. Even count: the mean of the middle two.
    //      Sort a copy — the caller's array must come back untouched.
    static long median(long[] samples) {
        return 0;
    }

    // ---- main is written for you ------------------------------------------

    public static void main(String[] args) {
        int[] mixed = { 5, 3, 5, 9, 1, 3, 9 };
        int[] duplicates = { 4, 4, 4, 4 };
        int[] empty = new int[0];

        System.out.println("j vs jFast on mixed: " + j(mixed).equals(jFast(mixed)));
        System.out.println("j vs jFast on duplicates: " + j(duplicates).equals(jFast(duplicates)));
        System.out.println("j vs jFast on empty: " + j(empty).equals(jFast(empty)));
        System.out.println("jFast mixed: " + jFast(mixed));
        System.out.println("jFast duplicates: " + jFast(duplicates));
        System.out.println("jFast empty: " + jFast(empty));

        long[] odd = { 50, 10, 30 };
        long[] even = { 50, 10, 30, 40 };
        System.out.println("median odd = " + median(odd));
        System.out.println("median even = " + median(even));
        System.out.println("median single = " + median(new long[] { 7 }));
        System.out.println("median leaves the caller's array alone: " + (odd[0] == 50 && even[0] == 50));

        System.out.println("timing (median of 3 runs, microseconds)");
        int[] sizes = { 500, 1000, 2000 };
        for (String snippet : new String[] { "b", "e", "jFast" }) {
            StringBuilder row = new StringBuilder("  " + snippet);
            for (int n : sizes) {
                long[] samples = new long[3];
                for (int run = 0; run < 3; run++) {
                    int[] data = ramp(n);
                    long started = System.nanoTime();
                    runSnippet(snippet, data);
                    samples[run] = (System.nanoTime() - started) / 1000;
                }
                row.append(" n=").append(n).append(" t=").append(median(samples));
            }
            System.out.println(row);
        }
    }

    /** Plenty of repeats, so the membership test in j and jFast has work to do. */
    static int[] ramp(int n) {
        int[] data = new int[n];
        for (int k = 0; k < n; k++) {
            data[k] = k % (n / 4 + 1);
        }
        return data;
    }

    static void runSnippet(String name, int[] data) {
        if (name.equals("b")) b(data);
        else if (name.equals("e")) e(data);
        else jFast(data);
    }
}
`,
    tests: [
      {
        name: 'jFast returns exactly what j returned',
        describe: 'The HashSet version agrees with the quadratic one on mixed, all-duplicate and empty input',
        pattern:
          'j vs jFast on mixed: true\\nj vs jFast on duplicates: true\\nj vs jFast on empty: true',
      },
      {
        name: 'jFast keeps first-occurrence order',
        describe: 'The distinct values of 5 3 5 9 1 3 9, in the order each was first seen',
        pattern: 'jFast mixed: \\[5, 3, 9, 1\\]\\njFast duplicates: \\[4\\]\\njFast empty: \\[\\]',
      },
      {
        name: 'median handles an odd and an even count',
        describe: 'Three samples give the middle one; four give the mean of the middle two',
        pattern: 'median odd = 30\\nmedian even = 35\\nmedian single = 7',
      },
      {
        name: 'median sorts a copy, not the caller’s array',
        describe: 'Both sample arrays still start with 50 after median has run',
        pattern: "median leaves the caller's array alone: true",
      },
      {
        name: 'The timing table runs all three snippets at all three sizes',
        describe: 'One row per snippet, each with a median time at n=500, n=1000 and n=2000',
        pattern:
          'timing \\(median of 3 runs, microseconds\\)\\n  b n=500 t=\\d+ n=1000 t=\\d+ n=2000 t=\\d+\\n  e n=500 t=\\d+ n=1000 t=\\d+ n=2000 t=\\d+\\n  jFast n=500 t=\\d+ n=1000 t=\\d+ n=2000 t=\\d+',
      },
    ],
  },
];
