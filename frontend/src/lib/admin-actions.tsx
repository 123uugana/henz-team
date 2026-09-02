export function downloadCsv(
  filename: string,
  headers: string[],
  rows: Array<Array<string | number | null | undefined>>,
) {
  const escapeCell = (value: string | number | null | undefined) => {
    const text = value == null ? "" : String(value);
    return `"${text.replaceAll('"', '""')}"`;
  };
  const csv = [
    headers.map(escapeCell).join(","),
    ...rows.map((row) => row.map(escapeCell).join(",")),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function Notice({ message }: { message: string | null }) {
  if (!message) return null;

  return (
    <div className="mb-5 rounded-lg border border-[#43d3c5]/30 bg-[#123b46] px-4 py-3 text-sm text-[#8cf0e7]">
      {message}
    </div>
  );
}
