import { useEffect, useMemo, useState } from "react";
import { ALL_PROVIDER_META, type ProviderMeta } from "@/lib/ai-providers";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { TrashIcon, CopyIcon } from "lucide-react";
import { trpc } from "@/utils/trpc";
import { Skeleton } from "../ui/skeleton";

type Provider = ProviderMeta;
const ALL_PROVIDERS: Provider[] = ALL_PROVIDER_META;

export default function ApiKeySetting() {
  const [activeProviderIds, setActiveProviderIds] = useState<string[]>([]);
  const [apiKeysByProviderId, setApiKeysByProviderId] = useState<
    Record<string, string>
  >({});
  const [savedApiKeysByProviderId, setSavedApiKeysByProviderId] = useState<
    Record<string, string>
  >({});
  const [apiKeyIdByProviderId, setApiKeyIdByProviderId] = useState<
    Record<string, string>
  >({});

  const {
    data: apiKeys,
    isPending,
    refetch: refetchApiKeys,
  } = trpc.apiKey.listApiKeys.useQuery();

  const { mutate: createApiKey } = trpc.apiKey.createApiKey.useMutation({
    onSuccess: () => {
      refetchApiKeys();
    },
  });
  const { mutate: deleteApiKey } = trpc.apiKey.deleteApiKey.useMutation({
    onSuccess: () => {
      refetchApiKeys();
    },
  });
  const { mutate: updateApiKey } = trpc.apiKey.updateApiKey.useMutation({
    onSuccess: () => {
      refetchApiKeys();
    },
  });

  const availableToAdd = useMemo(
    () => ALL_PROVIDERS.filter((p) => !activeProviderIds.includes(p.id)),
    [activeProviderIds]
  );

  const providerById = useMemo(() => {
    const map = new Map<string, Provider>();
    for (const p of ALL_PROVIDERS) {
      if (!map.has(p.id)) map.set(p.id, p);
    }
    return map;
  }, []);

  // hydrate from server: show providers with existing keys, prefill values, and remove them from dropdown
  useEffect(() => {
    if (!apiKeys || apiKeys.length === 0) return;
    const serverProviderIds = Array.from(
      new Set(apiKeys.map((k) => k.modelProviderId))
    );
    setActiveProviderIds(
      (ids: string[]) =>
        Array.from(new Set([...ids, ...serverProviderIds])) as string[]
    );
    setApiKeyIdByProviderId((m) => {
      const next = { ...m } as Record<string, string>;
      for (const row of apiKeys) {
        next[row.modelProviderId] = row.id;
      }
      return next;
    });
    // prefill inputs and saved baselines from DB
    setSavedApiKeysByProviderId((m) => {
      const next = { ...m } as Record<string, string>;
      for (const row of apiKeys) {
        if (next[row.modelProviderId] === undefined)
          next[row.modelProviderId] = row.key ?? "";
      }
      return next;
    });
    setApiKeysByProviderId((m) => {
      const next = { ...m } as Record<string, string>;
      for (const row of apiKeys) {
        if (next[row.modelProviderId] === undefined)
          next[row.modelProviderId] = row.key ?? "";
      }
      return next;
    });
  }, [apiKeys]);

  function handleBlurSave(providerId: string) {
    const provider = providerById.get(providerId);
    if (!provider) return;

    const nextValue = (apiKeysByProviderId[providerId] ?? "").trim();
    const prevValue = (savedApiKeysByProviderId[providerId] ?? "").trim();

    // no change or empty: do nothing
    if (nextValue.length === 0 || nextValue === prevValue) return;

    const existingId = apiKeyIdByProviderId[providerId];
    if (existingId) {
      updateApiKey(
        { id: existingId, key: nextValue },
        {
          onSuccess: (id) => {
            if (id) {
              setApiKeyIdByProviderId((m) => ({ ...m, [providerId]: id }));
            }
            setSavedApiKeysByProviderId((m) => ({
              ...m,
              [providerId]: nextValue,
            }));
          },
          onError: (error) => {},
        }
      );
    } else {
      createApiKey(
        {
          providerId: provider.id,
          key: nextValue,
          providerName: provider.name,
        },
        {
          onSuccess: (newId) => {
            if (newId) {
              setApiKeyIdByProviderId((m) => ({ ...m, [providerId]: newId }));
            }
            setSavedApiKeysByProviderId((m) => ({
              ...m,
              [providerId]: nextValue,
            }));
          },
          onError: (error) => {},
        }
      );
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Model providers</CardTitle>
        <CardDescription>
          Add provider API keys. We will use these to call their models.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="text-muted-foreground text-sm">Popular providers</div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={isPending}>
                Add provider
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              {availableToAdd.length > 0 ? (
                availableToAdd.map((p) => (
                  <DropdownMenuItem
                    key={p.id}
                    onClick={() =>
                      setActiveProviderIds((ids) =>
                        Array.from(new Set([...ids, p.id]))
                      )
                    }
                  >
                    {p.name}
                  </DropdownMenuItem>
                ))
              ) : (
                <div className="text-muted-foreground px-2 py-1.5 text-sm">
                  All providers added
                </div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {isPending ? (
          <div className="grid gap-5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-40" />
                <div className="flex items-center gap-2">
                  <Skeleton className="h-9 w-full" />
                  <Skeleton className="h-9 w-9" />
                  <Skeleton className="h-9 w-9" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {activeProviderIds.length === 0 ? (
              <div className="text-muted-foreground text-sm">
                No API key added. Use &quot;Add provider&quot; to add one.
              </div>
            ) : null}

            <div className="grid gap-5">
              {activeProviderIds.map((providerId) => {
                const provider = providerById.get(providerId);
                if (!provider) return null;
                const value = apiKeysByProviderId[providerId] ?? "";
                return (
                  <div key={providerId} className="flex">
                    <div className="w-full space-y-4">
                      <Label htmlFor={`key-${providerId}`}>
                        {provider.name}
                      </Label>
                      <div className="flex items-center gap-2">
                        <Input
                          id={`key-${providerId}`}
                          type="password"
                          placeholder={provider.placeholder ?? "Enter API key"}
                          value={value}
                          onChange={(e) =>
                            setApiKeysByProviderId((prev) => ({
                              ...prev,
                              [providerId]: e.target.value,
                            }))
                          }
                          onBlur={() => handleBlurSave(providerId)}
                        />
                        {apiKeyIdByProviderId[providerId] ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              try {
                                await navigator.clipboard.writeText(
                                  savedApiKeysByProviderId[providerId] ??
                                    value ??
                                    ""
                                );
                              } catch (err) {
                                console.error(err);
                              }
                            }}
                          >
                            <CopyIcon className="size-4" />
                          </Button>
                        ) : null}
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            const id = apiKeyIdByProviderId[providerId];
                            if (!id) {
                              // nothing persisted yet; just remove from UI
                              setActiveProviderIds((ids) =>
                                ids.filter((v) => v !== providerId)
                              );
                              setApiKeysByProviderId((m) => {
                                const { [providerId]: _omit, ...rest } = m;
                                return rest;
                              });
                              setSavedApiKeysByProviderId((m) => {
                                const { [providerId]: _omit, ...rest } = m;
                                return rest;
                              });
                              setApiKeyIdByProviderId((m) => {
                                const { [providerId]: _omit, ...rest } = m;
                                return rest;
                              });
                              return;
                            }

                            deleteApiKey(
                              { id },
                              {
                                onSuccess: () => {
                                  setActiveProviderIds((ids) =>
                                    ids.filter((v) => v !== providerId)
                                  );
                                  setApiKeysByProviderId((m) => {
                                    const { [providerId]: _omit, ...rest } = m;
                                    return rest;
                                  });
                                  setSavedApiKeysByProviderId((m) => {
                                    const { [providerId]: _omit, ...rest } = m;
                                    return rest;
                                  });
                                  setApiKeyIdByProviderId((m) => {
                                    const { [providerId]: _omit, ...rest } = m;
                                    return rest;
                                  });
                                  refetchApiKeys();
                                },
                                onError: (error) => {},
                              }
                            );
                          }}
                        >
                          <TrashIcon className="size-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
