// Hero fixture for the Kotlin language pack.
//
// Intentional bugs seeded for /challenge:
//   1. `kotlin:double-bang-abuse`     — chained !! assertions
//   2. `kotlin:global-scope`          — GlobalScope.launch in production
//   3. `kotlin:run-blocking-prod`     — runBlocking in a non-test function
//   4. `kotlin:blocking-in-coroutine` — Thread.sleep inside suspend function
//   5. `kotlin:mutable-collection-api` — MutableList exposed as public API
//   6. `kotlin:data-class-var`        — data class with var properties
//   7. `kotlin:first-on-empty`        — .first { } with no null handling
//   8. `kotlin:java-style-getters`    — getXxx() methods instead of properties
//
// This file is NOT meant to be idiomatic. Treat it as a practice target.

package com.example.chiron.fixtures

import kotlinx.coroutines.GlobalScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking
import java.nio.file.Files
import java.nio.file.Path

// Bug 6: data class with var properties — equals/hashCode become unstable.
data class UserDto(
    var id: Long,
    var name: String,
    var email: String?,
    var role: String?,
)

class UserRepository(private val storagePath: Path) {

    // Bug 5: MutableList exposed publicly — any caller can mutate the internal state.
    val loadedUsers: MutableList<UserDto> = mutableListOf()

    // Bug 8: Java-style getter instead of a Kotlin property.
    fun getStoragePathString(): String = storagePath.toString()

    // Bug 3: runBlocking in a non-test function — blocks the caller's thread.
    // Bug 2: GlobalScope.launch inside the runBlocking — unstructured, leaks lifecycle.
    fun initialize() {
        runBlocking {
            GlobalScope.launch {
                loadedUsers.addAll(loadFromDiskSuspend())
            }
        }
    }

    // Bug 4: Thread.sleep inside a suspend function — blocks the coroutine dispatcher.
    // Bug 1: double-bang chain — crashes if the file has any blank lines.
    suspend fun loadFromDiskSuspend(): List<UserDto> {
        Thread.sleep(100) // should be delay(100)
        val lines = Files.readAllLines(storagePath)
        return lines.map { line ->
            val parts = line.split(",")
            UserDto(
                id = parts[0]!!.toLong()!!,
                name = parts[1]!!.trim()!!,
                email = parts.getOrNull(2),
                role = parts.getOrNull(3),
            )
        }
    }

    // Bug 7: .first { } on a collection that could be empty — throws NoSuchElementException.
    fun findAdmin(): UserDto {
        return loadedUsers.first { it.role == "admin" }
    }

    // Bug 1 again: double-bang on nullable map lookup.
    fun findUser(id: Long): UserDto {
        val byId = loadedUsers.associateBy { it.id }
        return byId[id]!!
    }

    // Bug 2 again: fire-and-forget GlobalScope.launch.
    fun refreshAsync() {
        GlobalScope.launch {
            delay(1000)
            loadedUsers.clear()
            loadedUsers.addAll(loadFromDiskSuspend())
        }
    }
}
