using System.Security.Cryptography;
using CUE4Parse.FileProvider;
using CUE4Parse.UE4.Assets;
using CUE4Parse.UE4.Assets.Exports;
using CUE4Parse.UE4.Assets.Exports.Engine;
using CUE4Parse.UE4.Pak;
using CUE4Parse.UE4.Readers;
using CUE4Parse.UE4.Versions;

namespace Pakop;

internal sealed record FileEntry(string raw_path, string path, string hash);

internal static class PakOps
{
    private static readonly VersionContainer Versions = new(EGame.GAME_UE5_5);

    private static PakFileReader OpenPak(byte[] data)
    {
        var reader = new PakFileReader(new FByteArchive("data.pak", data, Versions));
        // Synchronous mount; ordinal comparer keeps keys case-sensitive like repak.
        // Never go through a provider's Mount() here: it blocks on Task.Run, which
        // deadlocks on single-threaded browser wasm.
        reader.Mount(StringComparer.Ordinal);
        return reader;
    }

    internal static List<FileEntry> ListOps(byte[] data, bool skipHash, bool ignoreUexp)
    {
        var reader = OpenPak(data);
        // ValidateMountPoint already turned "../../../X/" into "X/", so the Files
        // keys are the mount-joined, prefix-stripped paths the old Rust code produced.
        var mountPoint = reader.MountPoint;
        var result = new List<FileEntry>(reader.FileCount);

        foreach (var (path, gameFile) in reader.Files)
        {
            if (ignoreUexp && path.EndsWith(".uexp", StringComparison.OrdinalIgnoreCase)) continue;

            var rawPath = path.StartsWith(mountPoint, StringComparison.Ordinal)
                ? path[mountPoint.Length..]
                : path;
            var hash = skipHash ? "" : Convert.ToHexStringLower(SHA256.HashData(gameFile.Read()));
            result.Add(new FileEntry(rawPath, path, hash));
        }

        return result;
    }

    internal static IEnumerable<UObject> GetExports(byte[] pakData, string rawPath, byte[] mappingData)
    {
        var reader = OpenPak(pakData);
        var key = reader.MountPoint + rawPath;
        if (!reader.Files.TryGetValue(key, out var uassetFile))
            throw new FileNotFoundException($"Failed to read asset '{rawPath}': not found in pak");
        var uasset = uassetFile.Read();

        // The sibling .uexp is optional — its absence is not an error.
        byte[]? uexp = null;
        if (key.EndsWith(".uasset", StringComparison.Ordinal) &&
            reader.Files.TryGetValue(key[..^".uasset".Length] + ".uexp", out var uexpFile))
        {
            uexp = uexpFile.Read();
        }

        // Never-mounted provider, used purely to carry the usmap mappings and
        // engine version into Package deserialization.
        var provider = new StreamedFileProvider("pakop", Versions)
        {
            MappingsContainer = new BytesUsmapTypeMappingsProvider(mappingData),
        };

        // Build the archives ourselves: the byte[]-based Package constructor creates
        // FByteArchives without a VersionContainer, which parses the asset with the
        // latest UE version instead of this game's.
        var name = uassetFile.NameWithoutExtension;
        var uassetAr = new FByteArchive(name + ".uasset", uasset, Versions);
        var uexpAr = uexp is not null ? new FByteArchive(name + ".uexp", uexp, Versions) : null;
        var package = new Package(uassetAr, uexpAr, ubulk: (FArchive?)null, uptnl: (FArchive?)null, provider: provider);
        return package.ExportsLazy.Select(export => export.Value);
    }

    internal static string[] GetDataTableNames(byte[] pakData, string rawPath, byte[] mappingData)
    {
        foreach (var export in GetExports(pakData, rawPath, mappingData))
        {
            if (export is UDataTable dataTable)
            {
                // PlainText matches unreal_asset's get_owned_content() (no _{N} suffix).
                return dataTable.RowMap.Keys.Select(k => k.PlainText).ToArray();
            }
        }

        throw new InvalidOperationException("No DataTableExport found in asset");
    }
}
