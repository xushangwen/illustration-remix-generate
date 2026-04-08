import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/extract-style/route";
import { MAX_UPLOAD_BYTES } from "@/lib/image-utils";

function buildFormRequest(file?: File) {
  const formData = new FormData();
  if (file) {
    formData.append("image", file);
  }

  return new Request("http://localhost/api/extract-style", {
    method: "POST",
    body: formData,
  });
}

describe("extract-style route validation", () => {
  it("rejects requests without an uploaded image", async () => {
    const response = await POST(buildFormRequest());
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json).toEqual({ error: "请上传参考图片" });
  });

  it("rejects unsupported image mime types", async () => {
    const file = new File(["fake"], "reference.gif", { type: "image/gif" });

    const response = await POST(buildFormRequest(file));
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json).toEqual({ error: "不支持的图片格式，请上传 JPG、PNG 或 WebP" });
  });

  it("rejects oversized uploads before calling Gemini", async () => {
    const file = new File([new Uint8Array(MAX_UPLOAD_BYTES + 1)], "reference.png", {
      type: "image/png",
    });

    const response = await POST(buildFormRequest(file));
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json).toEqual({ error: "图片不能超过 10MB，请压缩后再试" });
  });
});
