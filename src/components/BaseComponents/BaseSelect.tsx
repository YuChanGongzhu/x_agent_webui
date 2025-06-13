import { Select } from "antd";
import { SelectProps } from "antd";

interface BaseSelectProps extends SelectProps {
    options: { label: string; value: string }[];
    children?: React.ReactNode;
}

const BaseSelect = ({ options, children, ...props }: BaseSelectProps) => {
    return (
        <div className="flex flex-col w-full">
            {children}
            <Select options={options} {...props}>
            </Select>
        </div>
    )
}

export default BaseSelect;