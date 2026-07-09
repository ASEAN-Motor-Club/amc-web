using CUE4Parse.MappingsProvider.Usmap;

namespace Pakop;

/// <summary>Loads .usmap mappings from an in-memory buffer (FileUsmapTypeMappingsProvider is path-only).</summary>
internal sealed class BytesUsmapTypeMappingsProvider : UsmapTypeMappingsProvider
{
    public BytesUsmapTypeMappingsProvider(byte[] data) => Load(data);

    public override void Reload() { }
}
