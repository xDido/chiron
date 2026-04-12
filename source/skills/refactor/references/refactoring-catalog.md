# Refactoring Catalog

Structured reference for {{command_prefix}}refactor. Load on first invocation per session. Use to identify code smells, name the corresponding refactoring, and guide the transformation.

## Code Smells

Named smells that signal structural problems. Each smell maps to one or more refactorings that address it.

### Long Method
- **Signal:** method body exceeds ~20 lines, or you need a comment to explain a section within it
- **Severity:** high — long methods are hard to test, hard to name, and hard to reuse
- **Refactoring:** Extract Method, Decompose Conditional

### Feature Envy
- **Signal:** a method accesses data from another object more than its own
- **Severity:** medium — indicates misplaced responsibility
- **Refactoring:** Move Method, Extract Method + Move Method

### God Class
- **Signal:** a class/struct has 10+ methods or 500+ lines, handles multiple unrelated responsibilities
- **Severity:** high — violates single responsibility, impossible to test in isolation
- **Refactoring:** Extract Class, Move Method

### Shotgun Surgery
- **Signal:** a single logical change requires edits in many unrelated files
- **Severity:** high — scattered changes are error-prone and hard to review
- **Refactoring:** Move Method, Move Field, Inline Class (consolidate the scattered behavior)

### Primitive Obsession
- **Signal:** using strings, ints, or floats to represent domain concepts (email as string, money as float, status as int)
- **Severity:** medium — loses type safety, validation scatters everywhere
- **Refactoring:** Introduce Parameter Object, Replace Type Code with Subclasses

### Data Clump
- **Signal:** the same group of parameters appears in multiple function signatures
- **Severity:** medium — signals a missing struct/type
- **Refactoring:** Introduce Parameter Object, Preserve Whole Object

### Switch Statements
- **Signal:** repeated type-checking (`switch type`, `if instanceof`, `case`) that grows with each new variant
- **Severity:** medium — open/closed principle violation; each new type requires editing the switch
- **Refactoring:** Replace Conditional with Polymorphism, Replace Type Code with Subclasses

### Speculative Generality
- **Signal:** interfaces with one implementation, type parameters used for one type, abstract classes with one subclass, unused configuration options
- **Severity:** low-medium — adds complexity for hypothetical future needs
- **Refactoring:** Inline Class, Remove Middle Man, Collapse Hierarchy

### Dead Code
- **Signal:** unreachable branches, unused functions, commented-out code, imports with no references
- **Severity:** low — but accumulates; increases cognitive load for readers
- **Refactoring:** Remove Dead Code (delete it — version control has the history)

### Middle Man
- **Signal:** a class that delegates every method to another class, adding no value
- **Severity:** low-medium — unnecessary indirection
- **Refactoring:** Remove Middle Man, Inline Class

### Inappropriate Intimacy
- **Signal:** two classes access each other's private/internal fields extensively
- **Severity:** medium — tight coupling that makes both classes hard to change independently
- **Refactoring:** Move Method, Move Field, Extract Class (to a shared dependency)

### Message Chain
- **Signal:** `a.getB().getC().getD().getValue()` — long chains of method calls navigating an object graph
- **Severity:** low-medium — couples the caller to the internal structure of every intermediate object
- **Refactoring:** Extract Method (wrap the chain), Move Method (put the logic where the data lives)

### Parallel Inheritance Hierarchies
- **Signal:** every time you add a subclass to one hierarchy, you must add a corresponding subclass to another
- **Severity:** medium — duplication of structure
- **Refactoring:** Move Method, Move Field (collapse one hierarchy into the other)

## Named Refactorings

Each refactoring transforms code structure without changing behavior. Listed with the smell(s) it addresses, the mechanism, what must not change, and risk level.

### Extract Method
- **Addresses:** Long Method, Feature Envy, Message Chain
- **Mechanism:** identify a coherent block of code, move it to a new method with a descriptive name, replace the block with a call to the new method. Pass only the variables the block needs.
- **Constraint:** behavior unchanged — same inputs produce same outputs. The extracted method must be callable independently.
- **Risk:** low — most IDE-supported, easy to verify

### Inline Method
- **Addresses:** Middle Man, Speculative Generality
- **Mechanism:** replace a method call with the method's body, then remove the method. Use when the method body is as clear as the method name.
- **Constraint:** no callers outside the class rely on the method being separate.
- **Risk:** low

### Move Method
- **Addresses:** Feature Envy, Shotgun Surgery, Inappropriate Intimacy
- **Mechanism:** move a method to the class whose data it primarily accesses. Update callers to use the new location.
- **Constraint:** behavior unchanged. All existing callers must work after the move (may require a delegation stub temporarily).
- **Risk:** medium — callers may need updating across multiple files

### Extract Class
- **Addresses:** God Class, Data Clump
- **Mechanism:** identify a subset of fields and methods that form a cohesive unit, move them to a new class. The original class holds a reference to the new class.
- **Constraint:** original class's public interface can change (methods delegate to new class) but external behavior must not change.
- **Risk:** medium — requires careful interface design

### Replace Conditional with Polymorphism
- **Addresses:** Switch Statements
- **Mechanism:** replace a switch/case or if/else chain that dispatches on type with an interface + concrete implementations. Each branch becomes a method on the corresponding type.
- **Constraint:** all cases must be covered. New implementations must satisfy the interface contract.
- **Risk:** medium-high — structural change; requires updating all call sites

### Replace Temp with Query
- **Addresses:** Long Method (intermediate variables that obscure intent)
- **Mechanism:** replace a temporary variable assignment with a method call that computes the value. The method name documents the intent.
- **Constraint:** the computation must have no side effects (or the side effects must be idempotent for multiple calls).
- **Risk:** low — but watch for performance if the query is expensive and called multiple times

### Introduce Parameter Object
- **Addresses:** Primitive Obsession, Data Clump
- **Mechanism:** replace a group of parameters that always travel together with a single struct/object. Add validation to the new type if appropriate.
- **Constraint:** all callers must be updated to pass the new object. The object's fields must match the replaced parameters.
- **Risk:** low-medium — mechanical change but touches many call sites

### Preserve Whole Object
- **Addresses:** Data Clump, Feature Envy
- **Mechanism:** instead of extracting several values from an object and passing them as separate parameters, pass the whole object. The callee accesses what it needs.
- **Constraint:** the callee must not become coupled to fields it doesn't use. If it only needs 1-2 fields, this refactoring may not apply.
- **Risk:** low

### Replace Type Code with Subclasses
- **Addresses:** Primitive Obsession, Switch Statements
- **Mechanism:** replace an integer/string type code with a class hierarchy. Each type code value becomes a subclass. Behavior that varies by type moves to the subclasses.
- **Constraint:** all type code values must be accounted for. No "unknown" values can slip through.
- **Risk:** medium — structural change

### Decompose Conditional
- **Addresses:** Long Method (complex conditional logic)
- **Mechanism:** extract the condition, the then-branch, and the else-branch into separate methods with descriptive names. The if-statement becomes readable as prose.
- **Constraint:** behavior unchanged. Each extracted method must handle exactly one branch.
- **Risk:** low

### Pull Up Method
- **Addresses:** Parallel Inheritance Hierarchies, duplicate code in subclasses
- **Mechanism:** move identical methods from subclasses to the parent class. If methods differ slightly, extract the shared logic and leave the varying parts as abstract methods.
- **Constraint:** the pulled-up method must work for all subclasses, not just the ones that currently have it.
- **Risk:** low-medium

### Push Down Method
- **Addresses:** Speculative Generality (method in parent used by only one subclass)
- **Mechanism:** move a method from the parent class to the specific subclass that uses it.
- **Constraint:** no other subclass or external caller relies on the method being in the parent.
- **Risk:** low

### Extract Interface
- **Addresses:** Inappropriate Intimacy, testing (need to mock a dependency)
- **Mechanism:** define an interface from the public methods of a class. Change callers to depend on the interface instead of the concrete class.
- **Constraint:** all implementations of the interface must satisfy the full contract. Don't create interfaces with one implementation for the sake of it (Speculative Generality).
- **Risk:** low

### Rename Method
- **Addresses:** any smell where naming obscures intent
- **Mechanism:** rename a method to better describe what it does. Update all callers.
- **Constraint:** behavior unchanged. The new name must be more descriptive, not just different.
- **Risk:** low — IDE-supported

### Replace Magic Number with Constant
- **Addresses:** Primitive Obsession (numeric literals scattered in code)
- **Mechanism:** extract a numeric literal into a named constant. The constant name documents the meaning.
- **Constraint:** the constant must be used everywhere the magic number appeared. Don't create constants for numbers that are self-evident (0, 1 in simple contexts).
- **Risk:** low

### Encapsulate Collection
- **Addresses:** Inappropriate Intimacy (exposing internal collections)
- **Mechanism:** replace direct access to a collection field with methods that add, remove, and query elements. Return an unmodifiable view or copy from the getter.
- **Constraint:** no caller should be able to mutate the collection without going through the encapsulating methods.
- **Risk:** low-medium — requires finding all direct accesses

## Refactoring Pre-Delivery Checklist

Before delivering refactored code at L4, verify silently:

1. Behavior unchanged — same inputs produce same outputs
2. Tests pass (or updated to match new structure without changing assertions)
3. No new smells introduced (refactoring didn't create a different problem)
4. Naming reflects new structure
5. No AI code tells in the refactored code
