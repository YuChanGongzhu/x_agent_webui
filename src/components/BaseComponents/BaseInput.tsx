import { Input } from "antd";
import { InputProps } from "antd";

interface BaseInputProps extends InputProps {
    children?: React.ReactNode;
    className?: string;
    inputClassName?: string;
}

const BaseInput = ({ children, className, inputClassName, ...props }: BaseInputProps) => {
    return (
        <div className={`flex flex-col w-full ${className}`}>
            {children}
            <Input className={inputClassName} autoComplete='off' {...props}>
            </Input>
        </div>
    )
}

export default BaseInput;