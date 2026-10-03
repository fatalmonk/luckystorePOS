/* eslint-disable formatjs/no-literal-string-in-jsx */
import {
  Button,
  FormField,
  MultilineInput,
  Rows,
  Text,
  TextInput,
} from "@canva/app-ui-kit";
import { AppUiProvider } from "@canva/app-ui-kit";
import type {
  ContentPublisherIntent,
  PublishContentRequest,
  RenderPreviewUiRequest,
  RenderSettingsUiRequest,
} from "@canva/intents/content";
import { createRoot } from "react-dom/client";
import { useEffect, useState } from "react";
import { requestOpenExternalUrl } from "@canva/platform";
import { canvaApiRequest } from "src/lib/api";

function SettingsUi({ request }: { request: RenderSettingsUiRequest }) {
  const initial = request.invocationContext.publishRef
    ? (JSON.parse(request.invocationContext.publishRef) as {
        caption?: string;
        link?: string;
      })
    : {};
  const [caption, setCaption] = useState(initial.caption ?? "");
  const [link, setLink] = useState(initial.link ?? "");

  useEffect(() => {
    void request.updatePublishSettings({
      publishRef: JSON.stringify({ caption, link }),
      validityState: getValidityState(caption, link),
    });
  }, []);

  return (
    <AppUiProvider>
      <Rows spacing="2u">
        <Text>
          Choose a live Lucky Store product in the app panel, then add your
          Facebook caption.
        </Text>
        <FormField
          label="Caption"
          value={caption}
          control={(props) => (
            <MultilineInput
              {...props}
              maxLength={5000}
              onChange={(value) => {
                setCaption(value);
                void request.updatePublishSettings({
                  publishRef: JSON.stringify({ caption: value, link }),
                  validityState: getValidityState(value, link),
                });
              }}
              placeholder="Write a concise Lucky Store caption"
            />
          )}
        />
        <FormField
          label="Storefront link"
          labelMarker="optional"
          value={link}
          control={(props) => (
            <TextInput
              {...props}
              type="url"
              onChange={(value) => {
                setLink(value);
                void request.updatePublishSettings({
                  publishRef: JSON.stringify({ caption, link: value }),
                  validityState: getValidityState(caption, value),
                });
              }}
              placeholder="https://luckystore1947.com"
            />
          )}
        />
      </Rows>
    </AppUiProvider>
  );
}

function getValidityState(caption: string, link: string) {
  const trimmedLink = link.trim();
  let validLink = !trimmedLink;
  if (trimmedLink) {
    try {
      const url = new URL(trimmedLink);
      validLink = url.protocol === "http:" || url.protocol === "https:";
    } catch {
      validLink = false;
    }
  }
  return caption.trim() && validLink
    ? "valid"
    : "invalid_missing_required_fields";
}

function PreviewUi({ request }: { request: RenderPreviewUiRequest }) {
  void request;
  return (
    <AppUiProvider>
      <Rows spacing="2u">
        <Text>
          Your Canva design will be published to the connected Lucky Store
          Facebook page.
        </Text>
        <Button
          variant="secondary"
          onClick={() =>
            void requestOpenExternalUrl({ url: "https://luckystore1947.com" })
          }
        >
          Visit Lucky Store
        </Button>
      </Rows>
    </AppUiProvider>
  );
}

const contentPublisher: ContentPublisherIntent = {
  getPublishConfiguration: async () => ({
    status: "completed",
    outputTypes: [
      {
        id: "facebook_post",
        displayName: "Lucky Store Facebook post",
        contentNoun: "post",
        mediaSlots: [
          {
            id: "main_image",
            displayName: "Post image",
            fileCount: { exact: 1 },
            accepts: {
              image: { format: "jpg", aspectRatio: { min: 0.8, max: 1.91 } },
            },
          },
        ],
      },
    ],
  }),
  renderSettingsUi: (request) => {
    createRoot(document.getElementById("root") as Element).render(
      <SettingsUi request={request} />,
    );
  },
  renderPreviewUi: (request) => {
    createRoot(document.getElementById("root") as Element).render(
      <PreviewUi request={request} />,
    );
  },
  publishContent: async (request: PublishContentRequest) => {
    try {
      const settings = request.publishRef
        ? (JSON.parse(request.publishRef) as {
            caption?: string;
            link?: string;
          })
        : {};
      const file = request.outputMedia[0]?.files[0];
      if (!file || file.format !== "jpg") {
        return {
          status: "app_error",
          message: "A JPG design export is required.",
          httpCode: 400,
        };
      }
      const result = await canvaApiRequest<{
        postId?: string;
        externalUrl?: string;
      }>("/functions/v1/canva-social", {
        method: "POST",
        body: JSON.stringify({
          caption: settings.caption,
          link: settings.link?.trim() || undefined,
          mediaUrl: file.url,
          platform: "facebook",
        }),
      });
      if (!result.postId) return { status: "remote_request_failed" };
      return {
        status: "completed",
        externalId: result.postId,
        externalUrl: result.externalUrl,
      };
    } catch (error) {
      return {
        status: "app_error",
        message: error instanceof Error ? error.message : "Publishing failed",
      };
    }
  },
};

export default contentPublisher;
