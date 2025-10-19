"use client";

import { useEffect, useState } from "react";
import {
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalHeader,
  ModalFooter,
  Input,
} from "@heroui/react";
import { SlidersHorizontal, X } from "lucide-react";

export type Filters = {
  city?: string;
  minAge?: number;
  maxAge?: number;
};

type Props = {
  initial?: Filters;
  onApply: (next: Filters) => void;
  onClear: () => void;
  hasActiveFilters: boolean;
  className?: string;
};

export default function UserFilters({
  initial,
  onApply,
  onClear,
  hasActiveFilters,
  className,
}: Props) {
  const [isOpen, setOpen] = useState(false);
  const [city, setCity] = useState(initial?.city ?? "");
  const [minAge, setMinAge] = useState<number | undefined>(initial?.minAge);
  const [maxAge, setMaxAge] = useState<number | undefined>(initial?.maxAge);

  useEffect(() => {
    if (isOpen) {
      setCity(initial?.city ?? "");
      setMinAge(initial?.minAge);
      setMaxAge(initial?.maxAge);
    }
  }, [isOpen, initial?.city, initial?.minAge, initial?.maxAge]);

  const apply = () => {
    setOpen(false);
    onApply({
      city: city || undefined,
      minAge,
      maxAge,
    });
  };

  return (
    <div className={className}>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="flat"
          startContent={<SlidersHorizontal size={16} />}
          onPress={() => setOpen(true)}
        >
          Filters
        </Button>

        {hasActiveFilters && (
          <Button
            isIconOnly
            size="sm"
            variant="light"
            color="danger"
            aria-label="Clear filters"
            onPress={onClear}
          >
            <X size={16} />
          </Button>
        )}
      </div>

      <Modal isOpen={isOpen} onOpenChange={setOpen}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>Filter users</ModalHeader>
              <ModalBody className="space-y-3">
                <Input
                  label="City starts with"
                  size="sm"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="number"
                    label="Min age"
                    size="sm"
                    value={minAge ? String(minAge) : ""}
                    onChange={(e) => setMinAge(e.target.value ? Number(e.target.value) : undefined)}
                  />
                  <Input
                    type="number"
                    label="Max age"
                    size="sm"
                    value={maxAge ? String(maxAge) : ""}
                    onChange={(e) => setMaxAge(e.target.value ? Number(e.target.value) : undefined)}
                  />
                </div>
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>
                  Cancel
                </Button>
                <Button color="primary" onPress={apply}>
                  Apply
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
