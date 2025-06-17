import { Input } from "antd";
import { InputProps } from "antd";

interface BaseInputProps extends InputProps {
    children?: React.ReactNode;
    className?: string;
    inputClassName?: string;
    textareaConfig?: object
}

const BaseInput = ({ children, className, inputClassName, textareaConfig, ...props }: BaseInputProps) => {
    if (props.type === 'textarea') {
        return (
            <div className={`flex flex-col w-full ${className}`}>
                {children}
                <Input.TextArea className={inputClassName} autoComplete='off' {...textareaConfig}>
                </Input.TextArea>
            </div>
        )
    }

    return (
        <div className={`flex flex-col w-full ${className}`}>
            {children}
            <Input className={inputClassName} autoComplete='off' {...props as any}>
            </Input>
        </div>
    )
}

export default BaseInput;