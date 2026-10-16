# Content voice cleanup — module plan

Edits change **how** ideas are said, not what is taught (code, facts, exercise tasks stay the same). After each module batch, a **reviewer pass** checks against [ftc-documentation-style](.cursor/rules/ftc-documentation-style.mdc) and humanizer tells (no “comprehensive,” throat-clearing, duplicate RulesBox filler).

**Status key:** `done` | `in progress` | `pending`

---

## Java (`src/content/java/`)

| Module (sidebar `groupLabel`) | Lessons (lessonId) | Status |
|-------------------------------|-------------------|--------|
| **Java Basics** | `java-intro`, `java-setup`, `java-printing`, `java-variables`, `java-calculations`, `java-arrays` | done |
| **Programming Logic** | `java-conditionals`, `java-control`, `java-methods`, `java-try-catch` | done |
| **Loops and Iteration** | `java-for-loops`, `java-while-loops`, `java-loop-control`, `java-loop-best-practices` | done |
| **Object-Oriented Programming** | `java-classes` … `java-runtime-polymorphism` (8) | done |
| **Data Structures** | `java-ds-*` (8) | done (voice pass; descriptions already set) |
| **Common Algorithms** | `java-algo-*` (8) | done (voice pass; descriptions already set) |
| **Functions as Data** | `java-fn-*` (4) | done (voice pass; descriptions already set) |
| **Design Patterns** | `java-dp-*` (3) | done (voice pass; descriptions already set) |
| **Concurrency** | 4 lessons | done (voice pass; descriptions already set) |
| **Version Control** | 10 lessons | done |
| **Section overview** | `overview` (java) | done |

---

## FTC (`src/content/ftc/`)

| Module | Approx. lessons | Status |
|--------|-----------------|--------|
| Section overview | `overview` | done |
| OnBot Java Setup | 7 | done |
| OnBot Robot Hardware | 3 | done |
| OnBot Teleop | 5 | done |
| OnBot Autonomous | 3 | done |
| OnBot Debugging | 4 | done |
| Android Studio Setup | 2 | done |
| AS Odometry | 4 | done |
| AS Path Planning | 3 | done |
| AS Advanced Movement | 5 | done |
| AS Debugging Best Practices | 7 | done |

Draft skipped: `extra/ftc-curriculum-intro.mdx`

---

## FRC (`src/content/frc/`)

| Module | Notes | Status |
|--------|-------|--------|
| Section overview | `overview` | done |
| Environment Setup | 5 | done |
| FRC Basics | 6 | done |
| Command-Based | 8 | done |
| Control Theory | 5 | done |
| Pose Estimation | 5 | done |
| PID Tuning Practice | 6 | done |
| External Tools | 5 | done |
| Examples | 3 | done |
| Advanced Motor Config | 2 | done |
| Advanced Topics | 2 | done |

Draft skipped: `extra/frc-intro.mdx`, `extra/motor-pid-control.mdx`

---

## Comp (`src/content/comp/`)

| Module | Notes | Status |
|--------|-------|--------|
| Section overview | `overview` | done |
| Foundation `cp-*` | 4 (`cp-constraints`, `cp-data-types`, `cp-fast-io`, `cp-debugging`) | done |
| Foundation legacy `comp-*` | 3 (`comp-intro`, `comp-problem-solving`, `comp-big-o`) | done |
| Data structures legacy | 4 (`comp-arrays-strings`, `comp-hash-tables`, `comp-trie`, `comp-union-find`) | done |
| Algorithms `cp-*` + legacy | 11 | done |
| Advanced `cp-*` + legacy | 11 | done |
| Strategies `cp-*` + legacy | 6 | done |

---

## Homepage

| File | Status |
|------|--------|
| `src/content/homepage/index.mdx` | done |

---

## Reviewer checklist (every module)

1. No `Welcome to the comprehensive…` / `designed to take you from complete beginner…`
2. `description` frontmatter is one plain sentence (if lesson had `description: ""`)
3. Headings: drop trailing `:` unless labeling a code block
4. RulesBox: no title repeats subtitle; bullets add information
5. Prose: shorter sentences; cut “critical,” “robust,” “Furthermore,” engagement padding
6. MDX: `` `>` `` not `` `&gt;` `` in markdown slots
7. Code fences and ExerciseBox `answers` JSON unchanged
