export function loadPaystackScript() {
  return new Promise((resolve, reject) => {
    if (window.PaystackPop) {
      resolve()
      return
    }
    const script = document.createElement('script')
    script.src = 'https://js.paystack.co/v2/inline.js'
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Could not load Paystack. Check your connection.'))
    document.body.appendChild(script)
  })
}
