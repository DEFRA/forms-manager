/**
 * @satisfies {import('@hapi/hapi').CommonRouteProperties}
 */
export const healthController = {
  handler(request, h) {
    return h.response({ message: 'success' }).code(200)
  }
}
