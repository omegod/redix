import { SearchOutlined } from "@ant-design/icons";
import { Input } from "antd";

interface KeySearchProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: () => Promise<void>;
}

export const KeySearch = ({ value, onChange, onSearch }: KeySearchProps) => {
  return (
    <Input.Search
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onSearch={async () => await onSearch()}
      placeholder="请输入搜索词..."
      enterButton={<SearchOutlined />}
    />
  );
};

export default KeySearch;
