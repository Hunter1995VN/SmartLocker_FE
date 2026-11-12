using System.Reflection;
using System.Text.Json;
using Application.Interfaces;
using Infrastructure.Data;
using Infrastructure.Mqtt;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

// Feeds the REAL DoorEventHandler (the code the MQTT subscriber calls) against the LOCAL e2e database.
// usage: doortool <deviceCode> <lockerId> <OPEN|CLOSED> [secondsAgo]
var conn = "Server=(localdb)\\MSSQLLocalDB;Database=SmartLockerE2E;Trusted_Connection=True;TrustServerCertificate=True;MultipleActiveResultSets=True;";
var device = args[0]; var locker = Guid.Parse(args[1]); var state = args[2];
var ago = args.Length > 3 ? int.Parse(args[3]) : 0;
var opts = new DbContextOptionsBuilder<SmartLockerDbContext>().UseSqlServer(conn).Options;
using var db = new SmartLockerDbContext(opts);
var notifier = DispatchProxy.Create<ILockerNotificationService, NoopProxy>();
var handler = new DoorEventHandler(db, notifier, new ConsoleLogger<DoorEventHandler>());
var payload = JsonSerializer.Serialize(new { schemaVersion = 1, eventId = Guid.NewGuid(), deviceCode = device, lockerId = locker, doorState = state, occurredAt = DateTimeOffset.UtcNow.AddSeconds(-ago) });
await handler.HandleAsync($"smartlocker/devices/{device}/door", payload, false, CancellationToken.None);
Console.WriteLine($"door {state} handled for {device}/{locker}");

public class NoopProxy : DispatchProxy
{
    protected override object? Invoke(MethodInfo? targetMethod, object?[]? args)
        => targetMethod!.ReturnType == typeof(Task) ? Task.CompletedTask : null;
}
public class ConsoleLogger<T> : ILogger<T>
{
    public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;
    public bool IsEnabled(LogLevel logLevel) => true;
    public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception? exception, Func<TState, Exception?, string> formatter)
        => Console.WriteLine($"[{logLevel}] {formatter(state, exception)}");
}
