export async function resizeImage(file: File, maxDimension = 1024) {
  if (!file.type.startsWith("image/")) {
    throw new Error("Зөвхөн зураг файл сонгоно уу.");
  }

  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("Зургийг уншиж чадсангүй."));
      element.src = objectUrl;
    });
    const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d");

    if (!context) throw new Error("Зургийг боловсруулах боломжгүй байна.");

    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.85)
    );

    if (!blob) throw new Error("Зургийг боловсруулах боломжгүй байна.");
    return new File([blob], "image.jpg", { type: "image/jpeg" });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
