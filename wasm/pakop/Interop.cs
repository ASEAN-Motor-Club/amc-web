using System.Runtime.InteropServices.JavaScript;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Pakop;

public static partial class PakopInterop
{
    [JSExport]
    internal static string[] List(byte[] data)
        => PakOps.ListOps(data, skipHash: true, ignoreUexp: false).Select(e => e.path).ToArray();

    // Object arrays can't cross the JSExport boundary — serialize to JSON and
    // parse in the JS shim.
    [JSExport]
    internal static string ListHash(byte[] data, bool ignoreUexp)
        => JsonSerializer.Serialize(
            PakOps.ListOps(data, skipHash: false, ignoreUexp),
            PakopJsonContext.Default.ListFileEntry);

    [JSExport]
    internal static string[] GetDatatablesNames(byte[] pakData, string rawPath, byte[] mappingData)
        => PakOps.GetDataTableNames(pakData, rawPath, mappingData);

    [JSExport]
    internal static void PrintExports(byte[] pakData, string rawPath, byte[] mappingData)
    {
        foreach (var export in PakOps.GetExports(pakData, rawPath, mappingData))
        {
            Console.WriteLine(Newtonsoft.Json.JsonConvert.SerializeObject(
                export, Newtonsoft.Json.Formatting.Indented));
        }
    }
}

[JsonSerializable(typeof(List<FileEntry>))]
internal partial class PakopJsonContext : JsonSerializerContext;
