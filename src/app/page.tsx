"use client";

import { useState, useCallback } from "react";

interface ResizedImage {
  ratio: string;
  label: string;
  dataUrl: string;
  width: number;
  height: number;
  fileSize: number;
}

export default function Home() {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [originalInfo, setOriginalInfo] = useState<{
    name: string;
    width: number;
    height: number;
    fileSize: number;
    type: string;
  } | null>(null);
  const [resizedImages, setResizedImages] = useState<ResizedImage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  };

  const resizeImage = useCallback(
    (
      img: HTMLImageElement,
      scale: number,
      originalType: string
    ): Promise<{ dataUrl: string; width: number; height: number; fileSize: number }> => {
      return new Promise((resolve) => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d")!;

        const newWidth = Math.round(img.width * scale);
        const newHeight = Math.round(img.height * scale);

        canvas.width = newWidth;
        canvas.height = newHeight;

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, newWidth, newHeight);

        const mimeType = originalType === "image/png" ? "image/png" : "image/jpeg";
        const quality = mimeType === "image/jpeg" ? 0.92 : undefined;
        const dataUrl = canvas.toDataURL(mimeType, quality);

        const base64 = dataUrl.split(",")[1];
        const fileSize = Math.round((base64.length * 3) / 4);

        resolve({ dataUrl, width: newWidth, height: newHeight, fileSize });
      });
    },
    []
  );

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("画像ファイルを選択してください");
      return;
    }

    setIsProcessing(true);
    setResizedImages([]);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      setOriginalImage(dataUrl);

      const img = new Image();
      img.onload = async () => {
        setOriginalInfo({
          name: file.name,
          width: img.width,
          height: img.height,
          fileSize: file.size,
          type: file.type,
        });

        // ファイルサイズを1/2、1/4、1/8にするには
        // ピクセル数（面積）を1/2、1/4、1/8にする
        // つまり、各辺を1/√2、1/2、1/√8にする
        const scales = [
          { ratio: "1/2", scale: 1 / Math.sqrt(2), label: "1/2サイズ" },
          { ratio: "1/4", scale: 1 / 2, label: "1/4サイズ" },
          { ratio: "1/8", scale: 1 / Math.sqrt(8), label: "1/8サイズ" },
        ];

        const results: ResizedImage[] = [];

        for (const { ratio, scale, label } of scales) {
          const result = await resizeImage(img, scale, file.type);
          results.push({
            ratio,
            label,
            ...result,
          });
        }

        setResizedImages(results);
        setIsProcessing(false);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleDownload = (dataUrl: string, ratio: string) => {
    if (!originalInfo) return;

    const extension = originalInfo.type === "image/png" ? "png" : "jpg";
    const baseName = originalInfo.name.replace(/\.[^/.]+$/, "");
    const fileName = `${baseName}_${ratio.replace("/", "-")}.${extension}`;

    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = fileName;
    link.click();
  };

  const handleDownloadAll = () => {
    resizedImages.forEach((img) => {
      handleDownload(img.dataUrl, img.ratio);
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">
            画像ファイルサイズダウン
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            画像のファイルサイズを1/2、1/4、1/8に減少させます
          </p>
        </header>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-8">
          <label
            htmlFor="file-input"
            className="block w-full cursor-pointer border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center hover:border-blue-500 dark:hover:border-blue-400 transition-colors"
          >
            <div className="text-gray-500 dark:text-gray-400">
              <svg
                className="mx-auto h-12 w-12 mb-4"
                stroke="currentColor"
                fill="none"
                viewBox="0 0 48 48"
              >
                <path
                  d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <p className="text-lg font-medium">
                クリックして画像を選択
              </p>
              <p className="text-sm mt-1">
                PNG、JPG、WEBP形式に対応
              </p>
            </div>
            <input
              id="file-input"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        </div>

        {isProcessing && (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
            <p className="mt-2 text-gray-600 dark:text-gray-300">処理中...</p>
          </div>
        )}

        {originalInfo && originalImage && !isProcessing && (
          <>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-8">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
                元の画像
              </h2>
              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-shrink-0">
                  <img
                    src={originalImage}
                    alt="Original"
                    className="max-w-xs max-h-64 object-contain rounded-lg border border-gray-200 dark:border-gray-700"
                  />
                </div>
                <div className="text-gray-600 dark:text-gray-300 space-y-2">
                  <p>
                    <span className="font-medium">ファイル名:</span>{" "}
                    {originalInfo.name}
                  </p>
                  <p>
                    <span className="font-medium">サイズ:</span>{" "}
                    {originalInfo.width} × {originalInfo.height} px
                  </p>
                  <p>
                    <span className="font-medium">ファイルサイズ:</span>{" "}
                    {formatFileSize(originalInfo.fileSize)}
                  </p>
                </div>
              </div>
            </div>

            {resizedImages.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
                    リサイズ後の画像
                  </h2>
                  <button
                    onClick={handleDownloadAll}
                    className="bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                  >
                    すべてダウンロード
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {resizedImages.map((img) => (
                    <div
                      key={img.ratio}
                      className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                    >
                      <div className="aspect-video bg-gray-100 dark:bg-gray-700 rounded-lg mb-4 flex items-center justify-center overflow-hidden">
                        <img
                          src={img.dataUrl}
                          alt={img.label}
                          className="max-w-full max-h-full object-contain"
                        />
                      </div>
                      <div className="text-center mb-4">
                        <h3 className="font-semibold text-lg text-gray-800 dark:text-white">
                          {img.label}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {img.width} × {img.height} px
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          約 {formatFileSize(img.fileSize)}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDownload(img.dataUrl, img.ratio)}
                        className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                      >
                        ダウンロード
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
