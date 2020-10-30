import httpProxy from 'http-proxy'

export const host = '172.26.27.51'
// export const host = '0.0.0.0'
export const port = 8080

export async function createServer(WSEndPoint: string, host: string, port: number) {
  await httpProxy
    .createServer({
      target: WSEndPoint, // where we are connecting
      ws: true,
      localAddress: host // where to bind the proxy
    })
    .listen(port); // which port the proxy should listen to
  return `ws://${host}:${port}`; // ie: ws://123.123.123.123:8080
}