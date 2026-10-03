import { useFeatureSupport } from "@canva/app-hooks";
import { upload, type ImageMimeType } from "@canva/asset";
import { Button, FormField, Rows, Text, TextInput } from "@canva/app-ui-kit";
import { addElementAtCursor, addElementAtPoint } from "@canva/design";
import { requestOpenExternalUrl } from "@canva/platform";
import { useEffect, useState } from "react";
import { useIntl } from "react-intl";
import { canvaApiRequest } from "src/lib/api";
import * as styles from "styles/components.css";

export const DOCS_URL = "https://www.canva.dev/docs/apps/";
/* eslint-disable formatjs/no-literal-string-in-jsx */

type Product = {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  sku: string | null;
};

export const App = () => {
  const isSupported = useFeatureSupport();
  const addElement = [addElementAtPoint, addElementAtCursor].find((fn) =>
    isSupported(fn),
  );
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const response = await canvaApiRequest<{ products: Product[] }>(
          `/functions/v1/canva-social?query=${encodeURIComponent(query)}`,
        );
        if (active) {
          setProducts(response.products);
          setError(null);
        }
      } catch (loadError) {
        if (active)
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load products",
          );
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [query]);

  const insertSelectedProduct = async () => {
    if (!addElement || !selectedProduct) {
      return;
    }

    try {
      await addElement({
        type: "text",
        children: [
          `${selectedProduct.name}\nBDT ${selectedProduct.price.toFixed(2)}`,
        ],
      });
      setUploadStatus(`Inserted ${selectedProduct.name} into the design.`);
    } catch (insertError) {
      setUploadStatus(
        insertError instanceof Error
          ? insertError.message
          : "Unable to insert product details.",
      );
    }
  };

  const insertProduct = (product: Product) => {
    if (!addElement) return;
    setSelectedProduct(product);
    setUploadStatus(null);
  };

  const uploadProductImage = async () => {
    if (!addElement || !selectedProduct?.image_url) return;
    setUploading(true);
    setUploadStatus(null);
    try {
      const imageUrl = new URL(selectedProduct.image_url);
      const mimeTypeByExtension: Record<string, ImageMimeType> = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".webp": "image/webp",
      };
      const extension = imageUrl.pathname.match(/\.[^.]+$/)?.[0].toLowerCase();
      const mimeType = extension ? mimeTypeByExtension[extension] : undefined;
      if (!mimeType) throw new Error("Unsupported product image format.");
      const image = await upload({
        type: "image",
        name: `Lucky Store - ${selectedProduct.name}`,
        mimeType,
        url: selectedProduct.image_url,
        thumbnailUrl: selectedProduct.image_url,
        aiDisclosure: "none",
      });
      await addElement({
        type: "image",
        ref: image.ref,
        altText: { text: selectedProduct.name, decorative: undefined },
      });
      await image.whenUploaded();
      setUploadStatus(
        "Product image uploaded to Canva and added to the design.",
      );
    } catch (uploadError) {
      setUploadStatus(
        uploadError instanceof Error
          ? uploadError.message
          : "Unable to upload product image.",
      );
    } finally {
      setUploading(false);
    }
  };

  const openExternalUrl = async (url: string) => {
    const response = await requestOpenExternalUrl({
      url,
    });

    if (response.status === "aborted") {
      // user decided not to navigate to the link
    }
  };

  const intl = useIntl();

  return (
    <div className={styles.scrollContainer}>
      <Rows spacing="2u">
        <Text>Live Lucky Store products</Text>
        <FormField
          label="Search products"
          value={query}
          control={(props) => (
            <TextInput
              {...props}
              onChange={setQuery}
              placeholder="Search by name or SKU"
            />
          )}
        />
        {error && (
          <div role="alert" aria-live="assertive">
            {error}
          </div>
        )}
        {products.map((product) => (
          <Button
            key={product.id}
            variant="secondary"
            onClick={() => insertProduct(product)}
            stretch
          >
            {`${product.name} · BDT ${product.price.toFixed(2)}`}
          </Button>
        ))}
        {selectedProduct && (
          <>
            <Text>{`Selected: ${selectedProduct.name}`}</Text>
            <Button
              variant="secondary"
              onClick={() => void uploadProductImage()}
              disabled={uploading || !selectedProduct.image_url || !addElement}
              stretch
            >
              {uploading
                ? "Uploading product image…"
                : "Upload product image to Canva"}
            </Button>
            {uploadStatus && (
              <div role="status" aria-live="polite">
                {uploadStatus}
              </div>
            )}
          </>
        )}
        <Button
          variant="primary"
          onClick={() => void insertSelectedProduct()}
          disabled={!addElement || !selectedProduct}
          tooltipLabel={
            !addElement
              ? intl.formatMessage({
                  defaultMessage:
                    "This feature is not supported in the current page",
                  description:
                    "Tooltip label for when a feature is not supported in the current design",
                })
              : undefined
          }
          stretch
        >
          {intl.formatMessage({
            defaultMessage: "Insert selected product",
            description:
              "Button text for inserting the selected product into the design.",
          })}
        </Button>
        <Button variant="secondary" onClick={() => openExternalUrl(DOCS_URL)}>
          Open Canva Apps SDK docs
        </Button>
      </Rows>
    </div>
  );
};
