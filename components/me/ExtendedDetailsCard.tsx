"use client";

import { useMemo } from "react";
import { Card, CardBody, Input, Select, SelectItem, Checkbox, Chip, Skeleton } from "@heroui/react";
import { useGetRefQuery } from "@/store/api"; // <- your RTK Query endpoint from earlier

type RefItem = { slug: string; label: string; meta?: any };
type ApiList = { data?: RefItem[] };

const DRINKING = ["no", "socially", "often"] as const;
const SMOKING = ["no", "occasionally", "regularly"] as const;

export function ExtendedDetailsCard({
  form,
  setForm,
}: {
  form: any;
  setForm: (updater: (s: any) => any) => void;
}) {
  // ---- Load DB-driven option lists ----
  const { data: lookingForResp, isFetching: lfLoading } = useGetRefQuery("looking_for");
  const { data: eduLevelResp, isFetching: elLoading } = useGetRefQuery("education_level");
  const { data: religionResp, isFetching: relLoading } = useGetRefQuery("religion");
  const { data: langResp, isFetching: langLoading } = useGetRefQuery("language");
  const { data: interestResp, isFetching: intLoading } = useGetRefQuery("interest");

  const LOOKING_FOR = (lookingForResp as ApiList)?.data ?? [];
  const EDUCATION_LEVEL = (eduLevelResp as ApiList)?.data ?? [];
  const RELIGIONS = (religionResp as ApiList)?.data ?? [];
  const LANGUAGE_OPTIONS = (langResp as ApiList)?.data ?? [];
  const INTEREST_OPTIONS = (interestResp as ApiList)?.data ?? [];

  const anyLoading = lfLoading || elLoading || relLoading || langLoading || intLoading;

  // For quick label lookup if you need to render badges elsewhere
  const labelBySlug = useMemo(() => {
    const map = new Map<string, string>();
    for (const arr of [
      LOOKING_FOR,
      EDUCATION_LEVEL,
      RELIGIONS,
      LANGUAGE_OPTIONS,
      INTEREST_OPTIONS,
    ]) {
      for (const o of arr) map.set(o.slug, o.label);
    }
    return map;
  }, [LOOKING_FOR, EDUCATION_LEVEL, RELIGIONS, LANGUAGE_OPTIONS, INTEREST_OPTIONS]);

  return (
    <Card>
      <CardBody className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Height */}
        <Input
          variant="bordered"
          size="sm"
          label="Height (cm)"
          labelPlacement="outside-top"
          type="number"
          value={String(form.height_cm ?? "")}
          onValueChange={(v) =>
            setForm((s: any) => ({ ...s, height_cm: v === "" ? null : Number(v) }))
          }
        />

        {/* Weight */}
        <Input
          variant="bordered"
          size="sm"
          label="Weight (kg)"
          labelPlacement="outside-top"
          type="number"
          value={String(form.weight_kg ?? "")}
          onValueChange={(v) =>
            setForm((s: any) => ({ ...s, weight_kg: v === "" ? null : Number(v) }))
          }
        />

        {/* Looking for (DB-driven) */}
        <div className="flex flex-col gap-2">
          <Select
            variant="bordered"
            size="sm"
            label="Looking for"
            isLoading={lfLoading}
            labelPlacement="outside"
            placeholder="Looking for"
            selectedKeys={form.looking_for ? [form.looking_for] : []}
            onChange={(e) => setForm((s: any) => ({ ...s, looking_for: e.target.value || null }))}
          >
            {LOOKING_FOR.map((o) => (
              <SelectItem key={o.slug}>{o.label}</SelectItem>
            ))}
          </Select>
        </div>

        {/* Education level (DB-driven) */}
        <div className="flex flex-col gap-2">
          <Select
            variant="bordered"
            size="sm"
            isLoading={elLoading}
            label="Education level"
            labelPlacement="outside"
            selectedKeys={form.education_level ? [form.education_level] : []}
            onChange={(e) =>
              setForm((s: any) => ({ ...s, education_level: e.target.value || null }))
            }
          >
            {EDUCATION_LEVEL.map((o) => (
              <SelectItem key={o.slug}>{o.label}</SelectItem>
            ))}
          </Select>
        </div>

        {/* Work */}
        <Input
          variant="bordered"
          size="sm"
          label="Work"
          labelPlacement="outside-top"
          value={form.work ?? ""}
          onValueChange={(v) => setForm((s: any) => ({ ...s, work: v }))}
        />

        {/* Education */}
        <Input
          variant="bordered"
          size="sm"
          label="Education"
          labelPlacement="outside-top"
          value={form.education ?? ""}
          onValueChange={(v) => setForm((s: any) => ({ ...s, education: v }))}
        />

        {/* Drinking (static) */}
        <Select
          variant="bordered"
          size="sm"
          label="Drinking"
          labelPlacement="outside"
          selectedKeys={form.drinking ? [form.drinking] : []}
          onChange={(e) => setForm((s: any) => ({ ...s, drinking: e.target.value || null }))}
        >
          {DRINKING.map((v) => (
            <SelectItem key={v}>{v.charAt(0).toUpperCase() + v.slice(1)}</SelectItem>
          ))}
        </Select>

        {/* Smoking (static) */}
        <Select
          variant="bordered"
          size="sm"
          label="Smoking"
          labelPlacement="outside"
          selectedKeys={form.smoking ? [form.smoking] : []}
          onChange={(e) => setForm((s: any) => ({ ...s, smoking: e.target.value || null }))}
        >
          {SMOKING.map((v) => (
            <SelectItem key={v}>
              {v === "no" ? "No" : v.charAt(0).toUpperCase() + v.slice(1)}
            </SelectItem>
          ))}
        </Select>

        {/* Religion (DB-driven) */}
        <div className="flex flex-col gap-2">
          <Select
            variant="bordered"
            size="sm"
            isLoading={relLoading}
            label="Religion"
            placeholder="Religion"
            labelPlacement="outside"
            selectedKeys={form.religion ? [form.religion] : []}
            onChange={(e) => setForm((s: any) => ({ ...s, religion: e.target.value || null }))}
          >
            {RELIGIONS.map((o) => (
              <SelectItem key={o.slug}>{o.label}</SelectItem>
            ))}
          </Select>
        </div>

        {/* Languages (DB-driven, multi via checkboxes) */}
        <div className="md:col-span-2">
          <label className="text-sm text-foreground-500">Languages</label>
          <div className="mt-2 flex flex-wrap gap-2">
            {langLoading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="rounded-full h-6 w-20" />
                ))
              : LANGUAGE_OPTIONS.map((o) => {
                  const on = form.languages?.includes(o.slug);
                  return (
                    <Checkbox
                      key={o.slug}
                      isSelected={!!on}
                      size="sm"
                      onValueChange={(val) =>
                        setForm((s: any) => {
                          const cur = Array.isArray(s.languages) ? s.languages : [];
                          return {
                            ...s,
                            languages: val
                              ? [...cur, o.slug]
                              : cur.filter((x: string) => x !== o.slug),
                          };
                        })
                      }
                      radius="full"
                    >
                      {o.label}
                    </Checkbox>
                  );
                })}
          </div>
        </div>

        {/* Interests (DB-driven, multi via chips) */}
        <div className="md:col-span-2">
          <label className="text-sm text-foreground-500">Interests</label>
          <div className="mt-2 flex flex-wrap gap-2">
            {intLoading
              ? Array.from({ length: 10 }).map((_, i) => (
                  <Skeleton key={i} className="rounded-medium h-7 w-24" />
                ))
              : INTEREST_OPTIONS.map((o) => {
                  const on = form.interests?.includes(o.slug);
                  return (
                    <Chip
                      key={o.slug}
                      onClick={() =>
                        setForm((s: any) => {
                          const cur = Array.isArray(s.interests) ? s.interests : [];
                          return {
                            ...s,
                            interests: on
                              ? cur.filter((x: string) => x !== o.slug)
                              : [...cur, o.slug],
                          };
                        })
                      }
                      className={`cursor-pointer ${on ? "bg-primary text-primary-foreground" : ""}`}
                    >
                      {o.label}
                    </Chip>
                  );
                })}
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
