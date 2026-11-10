const productImagesById: Record<string, string> = {
  P001: "/bolu-tapai.png",
  P002: "/brownies-kukus.png",
  P003: "/bolu-pisang.png",
  P004: "/brownies-pisang.png",
};

const productImagesByName: Record<string, string> = {
  "bolu tapai": "/bolu-tapai.png",
  "brownies kukus": "/brownies-kukus.png",
  "bolu pisang": "/bolu-pisang.png",
  "brownies pisang": "/brownies-pisang.png",
};

export function getProductImage(id: string, name: string) {
  return productImagesById[id] ?? productImagesByName[name.trim().toLocaleLowerCase("id-ID")] ?? null;
}
