const timeSleep = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export { timeSleep };