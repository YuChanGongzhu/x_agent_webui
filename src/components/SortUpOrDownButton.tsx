import React, { useEffect, useState } from 'react';
import { CaretUpOutlined, CaretDownOutlined } from '@ant-design/icons';
import { Tooltip } from 'antd';

interface SortUpOrDownButtonProps {
  onUp: () => void;
  onDown: () => void;
  onReset: () => void;
}

const TipContent_Arr = [
  '点击升序',
  '点击降序',
  '取消排序',
]

const SortUpOrDownButton: React.FC<SortUpOrDownButtonProps> = ({ onUp, onDown, onReset }) => {
  const [times, setTimes] = useState(0);
  const [tipContent, setTipContent] = useState(TipContent_Arr[0]);
  const handleClick = () => {
    const newTimes = (times + 1) % 3;

    if (newTimes === 1) {
      onUp();
    } else if (newTimes === 2) {
      onDown();
    } else {
      onReset();
    }
    setTimes(newTimes);
    setTipContent(TipContent_Arr[newTimes]);
  };
  return (
    <Tooltip title={tipContent}>
      <div className={`flex flex-col px-1`}>
        <CaretUpOutlined className={`${times === 1 ? 'text-blue-500' : 'text-gray-500'} cursor-pointer`} onClick={handleClick} />
        <CaretDownOutlined className={`${times === 2 ? 'text-blue-500' : 'text-gray-500'} cursor-pointer`} onClick={handleClick} />
      </div>
    </Tooltip>

  );
};

export default SortUpOrDownButton;