import { Select } from "antd";
import { SelectProps } from "antd";

interface BaseSelectProps extends SelectProps {
    options: { label: string; value: string }[];
    children?: React.ReactNode;
    className?: string;
    selectClassName?: string;
}

const BaseSelect = ({ options, children, className, selectClassName, ...props }: BaseSelectProps) => {
    return (
        <div className={`flex flex-col w-full ${className}`}>
            {children}
            <Select options={options} className={selectClassName} {...props}>
            </Select>
        </div>
    )
}

export default BaseSelect;