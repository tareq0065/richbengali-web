"use client";

import { Card, CardBody, Input, Select, SelectItem } from "@heroui/react";

export function QuickFieldsCard({
  form,
  setForm,
}: {
  form: any;
  setForm: (updater: (s: any) => any) => void;
}) {
  return (
    <Card>
      <CardBody className="grid gap-4">
        <Input
          variant="bordered"
          size="sm"
          label="Name"
          labelPlacement="outside-top"
          value={form.name}
          onValueChange={(v) => setForm((s: any) => ({ ...s, name: v }))}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            variant="bordered"
            size="sm"
            type="number"
            label="Age"
            labelPlacement="outside-top"
            value={String(form.age ?? "")}
            onValueChange={(v) => setForm((s: any) => ({ ...s, age: v }))}
          />
          <Select
            variant="bordered"
            size="sm"
            label="Gender"
            labelPlacement="outside"
            selectedKeys={form.gender ? [form.gender] : []}
            onChange={(e) => setForm((s: any) => ({ ...s, gender: e.target.value }))}
          >
            {["male", "female", "other"].map((g) => (
              <SelectItem key={g}>{g}</SelectItem>
            ))}
          </Select>
        </div>

        <Input
          variant="bordered"
          size="sm"
          label="City"
          labelPlacement="outside-top"
          value={form.city ?? ""}
          onValueChange={(v) => setForm((s: any) => ({ ...s, city: v }))}
        />
      </CardBody>
    </Card>
  );
}
