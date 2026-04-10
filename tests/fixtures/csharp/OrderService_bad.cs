// Hero fixture for the C# language pack.
//
// Intentional bugs seeded for /challenge:
//   1. `csharp:task-result-wait`        — .Result on a Task (deadlock risk)
//   2. `csharp:async-void`              — async void non-event-handler
//   3. `csharp:serial-await`            — independent awaits run sequentially
//   4. `csharp:missing-cancellation-token` — async method without CancellationToken
//   5. `csharp:string-concat-loop`      — += in a foreach
//   6. `csharp:interpolated-log-message` — $"..." in logger call
//   7. `csharp:datetime-now`            — DateTime.Now for timestamps
//   8. `csharp:public-list`             — List<T> exposed publicly
//   9. `csharp:catch-exception`         — broad catch Exception
//
// This file is NOT meant to be idiomatic. Treat it as a practice target.

using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;

namespace Chiron.Fixtures;

public class OrderService
{
    private readonly ILogger<OrderService> _logger;
    private readonly HttpClient _http;

    // Bug 8: List<T> exposed publicly — any caller can mutate internal state.
    public List<Order> ActiveOrders { get; } = new();

    public OrderService(ILogger<OrderService> logger, HttpClient http)
    {
        _logger = logger;
        _http = http;
    }

    // Bug 1: calling .Result on an async method — deadlocks under a sync context.
    public Order Load(long id)
    {
        return LoadAsync(id).Result;
    }

    // Bug 4: async method without CancellationToken parameter.
    // Bug 6: string interpolation inside _logger.LogInformation.
    public async Task<Order> LoadAsync(long id)
    {
        _logger.LogInformation($"Loading order {id}");
        var response = await _http.GetStringAsync($"/orders/{id}");
        return new Order { Id = id, Payload = response };
    }

    // Bug 3: three independent awaits run sequentially — should be Task.WhenAll.
    public async Task<DashboardData> LoadDashboardAsync(long userId)
    {
        var user = await LoadUserAsync(userId);
        var orders = await LoadOrdersAsync(userId);
        var notifications = await LoadNotificationsAsync(userId);
        return new DashboardData(user, orders, notifications);
    }

    private async Task<User> LoadUserAsync(long id)
    {
        return await Task.FromResult(new User { Id = id });
    }

    private async Task<IReadOnlyList<Order>> LoadOrdersAsync(long userId)
    {
        return await Task.FromResult<IReadOnlyList<Order>>(new List<Order>());
    }

    private async Task<IReadOnlyList<string>> LoadNotificationsAsync(long userId)
    {
        return await Task.FromResult<IReadOnlyList<string>>(new List<string>());
    }

    // Bug 2: async void on a non-event-handler method — exceptions crash the process.
    public async void FireAndForget(Order order)
    {
        await Task.Delay(10);
        if (order.Id < 0) throw new InvalidOperationException("bad order");
    }

    // Bug 5: += string concatenation in a loop.
    // Bug 7: DateTime.Now for audit timestamps.
    // Bug 6 again: interpolated log message.
    public string SummarizeOrders()
    {
        string summary = "";
        foreach (var o in ActiveOrders)
        {
            if (summary != "") summary += ", ";
            summary += o.Id + " (" + o.Payload + ")";
        }
        _logger.LogInformation($"Summary built at {DateTime.Now}: {summary}");
        return summary;
    }

    // Bug 9: broad catch(Exception) that swallows everything.
    public bool TryProcess(Order order)
    {
        try
        {
            ActiveOrders.Add(order);
            return true;
        }
        catch (Exception)
        {
            return false;
        }
    }
}

public class Order
{
    public long Id { get; set; }
    public string Payload { get; set; } = "";
}

public class User
{
    public long Id { get; set; }
}

public record DashboardData(User User, IReadOnlyList<Order> Orders, IReadOnlyList<string> Notifications);
