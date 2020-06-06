navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia
const video = document.getElementById('video')
const MASK_CLASSES = ['Mask', 'No Mask'];
let facemaskModel

Promise.all([
  faceapi.nets.ssdMobilenetv1.loadFromUri('models'),
  loadfacemaskModel('model/model.json')
]).then(startVideo)

async function loadfacemaskModel(urlModel) {
  facemaskModel = await tf.loadLayersModel(urlModel);
}

function startVideo() {
  navigator.getUserMedia(
    { video: {} }, stream => video.srcObject = stream, err => console.error(err)
  )
}

video.addEventListener('play', () => {
  const canvas = faceapi.createCanvasFromMedia(video)
  document.getElementById('video_area').append(canvas)
  const displaySize = { width: video.width, height: video.height }
  faceapi.matchDimensions(canvas, displaySize)
  document.getElementById('loading').innerHTML = 'Loaded... some seconds to start';

  setInterval(async () => {
    const detections = await faceapi.detectAllFaces(video)
    const faceImages = await faceapi.extractFaces(video, detections)

    const facemaskPredictions = tf.tidy(() => {
      return faceImages.map(canvas => tf.browser.fromPixels(canvas)
      .resizeNearestNeighbor([224, 224]).toFloat().reverse(2).expandDims().div(127.5).sub(1))
      .map(item => facemaskModel.predict(item))
    });

    const resizedDetections = faceapi.resizeResults(detections, displaySize)

    facemaskPredictions.forEach((facemaskPrediction, i) => {
      const maskLabel = MASK_CLASSES[facemaskPrediction.argMax(-1).dataSync()[0]];
      const faceBox = resizedDetections[i].box
      canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)
      const drawBox = new faceapi.draw.DrawBox(faceBox, { label: maskLabel.toString() , boxColor: maskLabel == MASK_CLASSES[0] ? 'blue' : 'red'})
      drawBox.draw(canvas)
      facemaskPrediction.dispose()
    })
  }, 200)
})