import dayjs from 'dayjs';

const timeSleep = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
}


const dateFormat = (date, format = 'YYYY-MM-DD HH:mm:ss') => {
    return dayjs(date).format(format);
}



export { timeSleep, dateFormat };