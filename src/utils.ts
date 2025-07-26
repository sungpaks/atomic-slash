export const getRandomColor = () => {
  const getHex = () =>
    Math.floor(Math.random() * 256)
      .toString(16)
      .padStart(2, "0");
  return `#${getHex()}${getHex()}${getHex()}`;
};
