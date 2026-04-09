// Hero fixture for the Java language pack.
//
// Intentional bugs seeded for /challenge:
//   1. `java:null-return`                — returns null for missing user
//   2. `java:null-collection-return`     — returns null for empty order list
//   3. `java:try-with-resources`         — close() in finally instead of t-w-r
//   4. `java:string-concat-loop`         — += building a summary
//   5. `java:string-equals-equals`       — == used to compare Strings
//   6. `java:unsynchronized-shared`      — shared counter without sync
//   7. `java:log-string-concat`          — string concat in log calls
//   8. `java:swallowed-interrupt`        — InterruptedException ignored
//
// This file is NOT meant to be idiomatic. Treat it as a practice target.

package com.example.chiron.fixtures;

import java.io.BufferedReader;
import java.io.FileReader;
import java.io.IOException;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class UserService {
    private static final Logger log = LoggerFactory.getLogger(UserService.class);

    // Bug 6: shared counter, no synchronization, no AtomicLong.
    private long requestCount;

    // Bug: legacy java.util.Date and non-thread-safe SimpleDateFormat shared as a field.
    private final SimpleDateFormat formatter = new SimpleDateFormat("yyyy-MM-dd");

    private final Map<Long, User> users = new HashMap<>();
    private final Map<Long, List<Order>> ordersByUser = new HashMap<>();

    public UserService() {
        users.put(1L, new User(1, "Alice", "alice@example.com", "admin"));
        users.put(2L, new User(2, "Bob", "bob@example.com", "member"));
    }

    // Bug 1: returns null instead of Optional<User>.
    public User findById(long id) {
        requestCount++; // bug 6 again
        User u = users.get(id);
        if (u == null) {
            return null;
        }
        return u;
    }

    // Bug 2: returns null for missing orders instead of List.of().
    public List<Order> getOrders(long userId) {
        List<Order> list = ordersByUser.get(userId);
        if (list == null) {
            return null;
        }
        return list;
    }

    // Bug 5: == on Strings to compare role names.
    public boolean isAdmin(User user) {
        if (user == null) return false;
        return user.role == "admin"; // should be .equals or Objects.equals
    }

    // Bug 3: manual close() in finally.
    // Bug 7: string concat in log call.
    public String loadFirstLine(String path) {
        BufferedReader reader = null;
        try {
            reader = new BufferedReader(new FileReader(path));
            String line = reader.readLine();
            log.info("read first line of " + path + ": " + line);
            return line;
        } catch (IOException e) {
            log.error("failed to read " + path, e);
            return null; // bug 1 again
        } finally {
            try {
                if (reader != null) reader.close();
            } catch (IOException e) {
                // swallowed; not worth propagating
            }
        }
    }

    // Bug 4: string concat in a loop.
    // Bug 7: log string concat again.
    public String summarizeUsers() {
        String summary = "";
        for (User u : users.values()) {
            if (summary != "") { // bug 5 again
                summary += ", ";
            }
            summary += u.name + " (" + u.email + ")";
        }
        log.debug("summary for " + users.size() + " users: " + summary);
        return summary;
    }

    // Bug 8: InterruptedException swallowed.
    public void waitAndRetry() {
        try {
            Thread.sleep(1000);
        } catch (InterruptedException e) {
            // ignored — caller loses the interrupt
        }
    }

    // Legacy Date usage (java:legacy-date) and SimpleDateFormat sharing (java:simpledateformat-sharing).
    public String today() {
        return formatter.format(new Date());
    }

    // Plain-class data carrier that could be a record.
    public static class User {
        public final long id;
        public final String name;
        public final String email;
        public final String role;

        public User(long id, String name, String email, String role) {
            this.id = id;
            this.name = name;
            this.email = email;
            this.role = role;
        }
    }

    public static class Order {
        public final long id;
        public final double total;

        public Order(long id, double total) {
            this.id = id;
            this.total = total;
        }
    }
}
