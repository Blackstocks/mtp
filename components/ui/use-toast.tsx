import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"

export function useToast() {
  return {
    toast: (props: any) => {
      console.log("Toast:", props)
    }
  }
}