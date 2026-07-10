import { Combobox, InputBase, useCombobox } from '@mantine/core';
import { IconChevronDown } from '@tabler/icons-react';
import { practiceDisplayModes, type PracticeDisplayKey } from '@/app/home/constants';

type PracticeDisplayComboboxProps = {
  value: PracticeDisplayKey;
  onChange: (value: PracticeDisplayKey) => void;
};

export function PracticeDisplayCombobox({ value, onChange }: PracticeDisplayComboboxProps) {
  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
  });

  return (
    <Combobox
      store={combobox}
      onOptionSubmit={(selected) => {
        onChange(selected as PracticeDisplayKey);
        combobox.closeDropdown();
      }}
    >
      <Combobox.Target>
        <InputBase
          component="button"
          type="button"
          pointer
          rightSection={<IconChevronDown size={14} />}
          onClick={() => combobox.toggleDropdown()}
          styles={{
            input: {
              minWidth: 180,
              fontWeight: 600,
            },
          }}
        >
          {practiceDisplayModes[value]}
        </InputBase>
      </Combobox.Target>

      <Combobox.Dropdown>
        <Combobox.Options>
          {Object.entries(practiceDisplayModes).map(([optionValue, label]) => (
            <Combobox.Option key={optionValue} value={optionValue}>
              {label}
            </Combobox.Option>
          ))}
        </Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  );
}
