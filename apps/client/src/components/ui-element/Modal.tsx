import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogTitle,
  DialogHeader,
  DialogContent,
  DialogDescription,
  DialogClose,
  DialogFooter,
} from "@/components/ui/dialog";

interface FooterButton {
  label: string;
  onClick: () => void;
  variant?: "default" | "outline" | "destructive";
  isLoading?: boolean;
}

interface ModalProps {
  title: string;
  description: string;
  children?: React.ReactNode;
  open: boolean;
  onClose: () => void;
  key?: string;
  footerButtons?: FooterButton[];
}
export default function Modal(props: ModalProps) {
  return (
    <Dialog open={props.open} onOpenChange={props.onClose} key={props.key}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{props.title}</DialogTitle>
          <DialogDescription>{props.description}</DialogDescription>
        </DialogHeader>
        <div className="max-h-[70vh] overflow-y-auto">{props.children}</div>
        <DialogFooter>
          {props.footerButtons?.map((button) => (
            <Button
              key={button.label}
              onClick={button.onClick}
              variant={button.variant ?? "default"}
            >
              {button.label}
            </Button>
          ))}
          <DialogClose asChild>
            <Button variant="outline" onClick={props.onClose}>
              Cancel
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface WarningModalProps extends ModalProps {
  onConfirm: () => void;
  isLoading?: boolean;
}

export function WarningModal(props: WarningModalProps) {
  return (
    <Modal
      title={props.title}
      description={props.description}
      open={props.open}
      onClose={props.onClose}
      footerButtons={[
        {
          label: "Confirm",
          onClick: props.onConfirm,
          variant: "destructive",
          isLoading: props.isLoading,
        },
      ]}
    />
  );
}
