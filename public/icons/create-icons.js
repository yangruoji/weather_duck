// 这是一个用于在浏览器中生成PWA图标的脚本
// 在浏览器控制台中运行此脚本来生成图标

function createIcon(size) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  
  // 背景圆形
  ctx.fillStyle = '#4A90E2';
  ctx.beginPath();
  ctx.arc(size/2, size/2, size/2, 0, 2 * Math.PI);
  ctx.fill();
  
  // 小鸭子身体
  ctx.fillStyle = '#FFD700';
  ctx.beginPath();
  ctx.ellipse(size/2, size*0.59, size*0.16, size*0.12, 0, 0, 2 * Math.PI);
  ctx.fill();
  
  // 小鸭子头部
  ctx.beginPath();
  ctx.arc(size/2, size*0.39, size*0.1, 0, 2 * Math.PI);
  ctx.fill();
  
  // 鸭嘴
  ctx.fillStyle = '#FF8C00';
  ctx.beginPath();
  ctx.ellipse(size*0.55, size*0.41, size*0.04, size*0.016, 0, 0, 2 * Math.PI);
  ctx.fill();
  
  // 眼睛
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.arc(size*0.48, size*0.37, size*0.012, 0, 2 * Math.PI);
  ctx.fill();
  
  // 眼睛高光
  ctx.fillStyle = '#FFF';
  ctx.beginPath();
  ctx.arc(size*0.484, size*0.367, size*0.004, 0, 2 * Math.PI);
  ctx.fill();
  
  return canvas;
}

// 生成所有尺寸的图标
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
sizes.forEach(size => {
  const canvas = createIcon(size);
  const link = document.createElement('a');
  link.download = `icon-${size}x${size}.png`;
  link.href = canvas.toDataURL('image/png');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
});

console.log('所有图标已生成并下载');