// Hero fixture for the Swift language pack.
//
// Intentional bugs seeded for /challenge:
//   1. `swift:force-unwrap`            — force-unwrapped dictionary/array lookups
//   2. `swift:force-cast`              — as! downcast
//   3. `swift:force-try`               — try! on a throwing call
//   4. `swift:blocking-in-async`       — String(contentsOfFile:) in async
//   5. `swift:strong-self-capture`     — closure captures self strongly
//   6. `swift:unstructured-task`       — Task { } without scope tracking
//   7. `swift:missing-await`           — async call discarded without await
//   8. `swift:class-over-struct`       — class where a struct would do
//   9. `swift:non-final-class`         — class missing `final`
//  10. `swift:silent-catch`            — empty catch block
//
// This file is NOT meant to be idiomatic. Treat it as a practice target.

import Foundation

// Bug 8: class with only let properties — should be a struct.
// Bug 9: missing `final`.
class Profile {
    let id: Int64
    let name: String
    let email: String?

    init(id: Int64, name: String, email: String?) {
        self.id = id
        self.name = name
        self.email = email
    }
}

// Bug 9: missing `final`.
class ProfileLoader {
    var completion: ((Profile) -> Void)?
    var cachedProfiles: [Int64: Profile] = [:]

    // Bug 4: String(contentsOfFile:) is blocking I/O inside an async function.
    // Bug 1: force-unwrap on dictionary lookup.
    func loadFromDisk(path: String) async throws -> Profile {
        let contents = try String(contentsOfFile: path, encoding: .utf8)
        let dict = parseDict(contents)
        return Profile(
            id: Int64(dict["id"]!)!,
            name: dict["name"]!,
            email: dict["email"],
        )
    }

    // Bug 2: as! downcast.
    // Bug 3: try! on a throwing call.
    func loadAny(_ any: Any, path: String) -> Profile {
        let typed = any as! Profile
        let fresh = try! JSONDecoder().decode(Profile.self, from: Data())
        _ = fresh
        return typed
    }

    // Bug 5: closure captures self strongly — retain cycle.
    // Bug 6: Task { } has no scope, no cancellation path.
    func startRefresh() {
        Task {
            let profile = try? await self.loadFromDisk(path: "/tmp/profile.json")
            self.cachedProfiles[profile!.id] = profile
            self.completion?(profile!)
        }
    }

    // Bug 10: empty catch block swallows errors.
    func trySave(_ profile: Profile) {
        do {
            let data = try JSONEncoder().encode(profile)
            try data.write(to: URL(fileURLWithPath: "/tmp/profile.json"))
        } catch {
            // ignored
        }
    }

    // Bug 7: async call discarded without await.
    func eagerFetch(id: Int64) {
        fetchRemoteProfile(id: id)
    }

    func fetchRemoteProfile(id: Int64) async throws -> Profile {
        return Profile(id: id, name: "Alice", email: nil)
    }

    private func parseDict(_ text: String) -> [String: String] {
        var result: [String: String] = [:]
        for line in text.split(separator: "\n") {
            let parts = line.split(separator: "=", maxSplits: 1)
            if parts.count == 2 {
                result[String(parts[0])] = String(parts[1])
            }
        }
        return result
    }
}
