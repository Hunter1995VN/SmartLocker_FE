using System.Text.RegularExpressions;
using Infrastructure.Data;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

// Creates a LOCAL database only. Refuses any non-local server.
var conn = args.Length > 0 ? args[0] : "Server=(localdb)\\MSSQLLocalDB;Database=SmartLockerE2E;Trusted_Connection=True;TrustServerCertificate=True;";
var lower = conn.ToLowerInvariant();
if (!(lower.Contains("(localdb)") || lower.Contains("server=localhost") || lower.Contains("server=.")))
{
    Console.WriteLine("REFUSED: not a local server");
    return 2;
}
var opts = new DbContextOptionsBuilder<SmartLockerDbContext>().UseSqlServer(conn).Options;
using var db = new SmartLockerDbContext(opts);
try { db.Database.EnsureDeleted(); } catch { }
// create empty DB through a master connection
var b = new SqlConnectionStringBuilder(conn);
var dbName = b.InitialCatalog;
b.InitialCatalog = "master";
using (var m = new SqlConnection(b.ConnectionString))
{
    m.Open();
    using var c = m.CreateCommand();
    c.CommandText = $"IF DB_ID(N'{dbName}') IS NULL CREATE DATABASE [{dbName}]";
    c.ExecuteNonQuery();
}
var script = db.Database.GenerateCreateScript();
script = Regex.Replace(script, @"ON DELETE CASCADE", "ON DELETE NO ACTION", RegexOptions.IgnoreCase);
var batches = Regex.Split(script, @"^\s*GO\s*$", RegexOptions.Multiline | RegexOptions.IgnoreCase);
using var sc = new SqlConnection(conn);
sc.Open();
int ok = 0, fail = 0;
foreach (var batch in batches)
{
    var sql = batch.Trim();
    if (sql.Length == 0) continue;
    try { using var cmd = sc.CreateCommand(); cmd.CommandText = sql; cmd.ExecuteNonQuery(); ok++; }
    catch (Exception ex) { fail++; Console.WriteLine("FAIL: " + ex.Message.Split('\n')[0] + " | " + sql[..Math.Min(80, sql.Length)].Replace("\n", " ")); }
}
Console.WriteLine($"batches ok={ok} fail={fail}");
using var cnt = sc.CreateCommand();
cnt.CommandText = "SELECT COUNT(*) FROM sys.tables";
Console.WriteLine("tables=" + cnt.ExecuteScalar());
if (fail == 0) Seed(db);
return fail == 0 ? 0 : 1;

static void Seed(SmartLockerDbContext db)
{
    var now = DateTime.UtcNow;
    var hasher = new Infrastructure.Services.BcryptPasswordHasher();
    var pw = hasher.Hash("E2e!Local-2026");
    Domain.Entities.User U(string name, string email, string phone, string role) => new()
    {
        Id = Guid.NewGuid(), FullName = name, Email = email, Phone = phone, PasswordHash = pw,
        Role = Enum.Parse<Domain.Enums.UserRole>(role), Status = Domain.Enums.UserStatus.ACTIVE, CreatedAt = now, UpdatedAt = now
    };
    var users = new[]
    {
        U("E2E Admin", "admin@e2e.local", "0900000001", "ADMIN"),
        U("E2E Staff", "staff@e2e.local", "0900000002", Enum.GetNames<Domain.Enums.UserRole>().Contains("STAFF") ? "STAFF" : "ADMIN"),
        U("E2E Traveler A", "a@e2e.local", "0900000003", "TRAVELER"),
        U("E2E Traveler B", "b@e2e.local", "0900000004", "TRAVELER"),
    };
    db.Users.AddRange(users);
    foreach (var (name, lat, lng) in new[] { ("E2E Station A", 10.7721m, 106.6980m), ("E2E Station B", 10.7800m, 106.7000m) })
    {
        var st = new Domain.Entities.Station
        {
            Id = Guid.NewGuid(), Name = name, Address = "1 Test Street, HCMC", Latitude = lat, Longitude = lng,
            Status = Domain.Enums.StationStatus.ACTIVE, OpensAt = new TimeOnly(0, 0), ClosesAt = new TimeOnly(23, 59),
            TotalS = 2, TotalM = 2, TotalL = 2, ContactPhone = "0900000099", CreatedAt = now, UpdatedAt = now
        };
        db.Stations.Add(st);
        var dev = new Domain.Entities.IoTDevice
        {
            Id = Guid.NewGuid(), StationId = st.Id, DeviceCode = "DEV-" + name[^1], DeviceType = "MASTER", MqttClientId = "dev-" + name[^1],
            ConnectivityStatus = "ONLINE", LastSeenAt = now, CreatedAt = now, UpdatedAt = now
        };
        db.IoTDevices.Add(dev);
        short pin = 1;
        foreach (var size in new[] { Domain.Enums.LockerSize.S, Domain.Enums.LockerSize.M, Domain.Enums.LockerSize.L })
        {
            decimal price = size == Domain.Enums.LockerSize.S ? 15000 : size == Domain.Enums.LockerSize.M ? 25000 : 40000;
            db.PricingPolicies.Add(new Domain.Entities.PricingPolicy
            {
                Id = Guid.NewGuid(), StationId = st.Id, Size = size, PricePerBlock = price, BlockHours = 1,
                OverdueFeePerHour = price * 4 / 3, GracePeriodMinutes = 15, MinHours = 1, MaxHours = 72, NoShowWindowMinutes = 90,
                RefundCutoffHours = 2, RefundRateEarly = 1m, RefundRateLate = 0.5m, EffectiveFrom = now.AddDays(-1), CreatedAt = now
            });
            for (int i = 1; i <= 2; i++)
            {
                db.Lockers.Add(new Domain.Entities.Locker
                {
                    Id = Guid.NewGuid(), StationId = st.Id, IoTDeviceId = dev.Id, LockerCode = $"{name[^1]}-{size}{i}", Size = size,
                    GpioPin = pin++, BusinessStatus = Domain.Enums.LockerBusinessStatus.AVAILABLE,
                    HealthStatus = Domain.Enums.LockerHealthStatus.HEALTHY, DoorState = "CLOSED", CreatedAt = now, UpdatedAt = now
                });
            }
        }
    }
    db.SaveChanges();
    Console.WriteLine($"seeded users={db.Users.Count()} stations={db.Stations.Count()} lockers={db.Lockers.Count()} policies={db.PricingPolicies.Count()}");
}
