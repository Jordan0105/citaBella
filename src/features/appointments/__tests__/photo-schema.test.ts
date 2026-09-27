import { describe, expect, it } from "vitest";
import {
  buildPhotoStoragePath,
  deletePhotoSchema,
  photoStoragePathSchema,
  savePhotoSchema,
  validatePhotoFile,
} from "../schemas/photo";

const APPOINTMENT_ID = "3f2504e0-4f89-11d3-9a0c-0305e82c3301";
const UUID = "3f2504e0-4f89-11d3-9a0c-0305e82c3302";

function makeFile(type: string, size: number): File {
  return new File([new Uint8Array(size)], "foto.jpg", { type });
}

describe("validatePhotoFile", () => {
  it("acepta JPG/PNG/WebP dentro del límite", () => {
    expect(validatePhotoFile(makeFile("image/jpeg", 1024))).toBeNull();
    expect(validatePhotoFile(makeFile("image/png", 1024))).toBeNull();
    expect(validatePhotoFile(makeFile("image/webp", 1024))).toBeNull();
  });

  it("rechaza tipos no permitidos", () => {
    expect(validatePhotoFile(makeFile("image/gif", 1024))).toMatch(/JPG/);
    expect(validatePhotoFile(makeFile("application/pdf", 1024))).toMatch(/JPG/);
  });

  it("rechaza archivos mayores a 5 MB", () => {
    const big = makeFile("image/jpeg", 5 * 1024 * 1024 + 1);
    expect(validatePhotoFile(big)).toMatch(/5 MB/);
  });
});

describe("buildPhotoStoragePath", () => {
  it("arma la ruta <appointment_id>/<uuid>.<ext>", () => {
    const path = buildPhotoStoragePath(APPOINTMENT_ID, "image/png", UUID);
    expect(path).toBe(`${APPOINTMENT_ID}/${UUID}.png`);
  });

  it("usa .jpg como extensión por defecto", () => {
    const path = buildPhotoStoragePath(APPOINTMENT_ID, "image/bmp", UUID);
    expect(path).toBe(`${APPOINTMENT_ID}/${UUID}.jpg`);
  });

  it("genera un id aleatorio si no se pasa", () => {
    const path = buildPhotoStoragePath(APPOINTMENT_ID, "image/webp");
    expect(path).toMatch(
      new RegExp(`^${APPOINTMENT_ID}/[0-9a-f-]{36}\\.webp$`),
    );
  });
});

describe("photoStoragePathSchema", () => {
  it("acepta rutas canónicas", () => {
    const result = photoStoragePathSchema.safeParse(
      `${APPOINTMENT_ID}/${UUID}.jpg`,
    );
    expect(result.success).toBe(true);
  });

  it("rechaza rutas fuera del patrón", () => {
    expect(photoStoragePathSchema.safeParse("foto.jpg").success).toBe(false);
    expect(
      photoStoragePathSchema.safeParse(`${APPOINTMENT_ID}/${UUID}.gif`).success,
    ).toBe(false);
    expect(photoStoragePathSchema.safeParse(`/etc/passwd`).success).toBe(false);
    expect(
      photoStoragePathSchema.safeParse(`${APPOINTMENT_ID}/../otra.jpg`).success,
    ).toBe(false);
  });
});

describe("savePhotoSchema", () => {
  it("acepta caption vacío", () => {
    const result = savePhotoSchema.safeParse({
      appointmentId: APPOINTMENT_ID,
      storagePath: `${APPOINTMENT_ID}/${UUID}.jpg`,
      caption: "",
    });
    expect(result.success).toBe(true);
  });

  it("rechaza captions de más de 300 caracteres", () => {
    const result = savePhotoSchema.safeParse({
      appointmentId: APPOINTMENT_ID,
      storagePath: `${APPOINTMENT_ID}/${UUID}.jpg`,
      caption: "x".repeat(301),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.caption).toBeDefined();
    }
  });

  it("rechaza appointmentId que no es uuid", () => {
    const result = savePhotoSchema.safeParse({
      appointmentId: "nope",
      storagePath: `${APPOINTMENT_ID}/${UUID}.jpg`,
    });
    expect(result.success).toBe(false);
  });
});

describe("deletePhotoSchema", () => {
  it("exige uuid válido", () => {
    expect(deletePhotoSchema.safeParse({ id: UUID }).success).toBe(true);
    expect(deletePhotoSchema.safeParse({ id: "x" }).success).toBe(false);
  });
});
