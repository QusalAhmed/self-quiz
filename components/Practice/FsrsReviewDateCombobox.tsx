import { Combobox, InputBase, useCombobox } from '@mantine/core';
import { IconCalendar, IconChevronDown } from '@tabler/icons-react';
import { fsrsReviewDateFilters, type FsrsReviewDateFilterKey } from '@/app/home/constants';

type FsrsReviewDateComboboxProps = {
  value: FsrsReviewDateFilterKey;
  onChange: (value: FsrsReviewDateFilterKey) => void;
};

export function FsrsReviewDateCombobox({ value, onChange }: FsrsReviewDateComboboxProps) {
  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
  });

  return (
    <Combobox
      store={combobox}
      onOptionSubmit={(selected) => {
        onChange(selected as FsrsReviewDateFilterKey);
        combobox.closeDropdown();
      }}
    >
      <Combobox.Target>
        <InputBase
          component="button"
          type="button"
          pointer
          leftSection={<IconCalendar size={14} />}
          rightSection={<IconChevronDown size={14} />}
          onClick={() => combobox.toggleDropdown()}
          styles={{
            input: {
              minWidth: 175,
              fontWeight: 600,
            },
          }}
        >
          {fsrsReviewDateFilters[value]}
        </InputBase>
      </Combobox.Target>

      <Combobox.Dropdown>
        <Combobox.Options>
          {Object.entries(fsrsReviewDateFilters).map(([optionValue, label]) => (
            <Combobox.Option key={optionValue} value={optionValue}>
              {label}
            </Combobox.Option>
          ))}
        </Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  );
}
