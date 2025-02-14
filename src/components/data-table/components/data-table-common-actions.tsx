"use client";

import ConfirmationDialog from "@/components/confirmation-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { EditIcon, EyeIcon, GripHorizontalIcon, TrashIcon } from "lucide-react";
import { useState } from "react";

interface DataTableCommonActionsProps {
  resourceId: string;
  disableView?: boolean;
  disableEdit?: boolean;
  disableDelete?: boolean;
  onClickView?: () => any;
  onClickEdit?: () => any;
  onDeleteConfirm?: () => any;
  className?: string;
}

export function DataTableCommonActions({
  disableView,
  disableEdit,
  disableDelete,
  onClickView = () => {},
  onClickEdit = () => {},
  onDeleteConfirm = () => {},
  className,
}: DataTableCommonActionsProps) {
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);

  return (
    <div className={cn("", className)}>
      <div className="hidden lg:flex justify-center gap-1">
        {!disableView && (
          <Button
            variant="ghost"
            title="Visualizar"
            onClick={onClickView}
            className="flex h-6 w-6 p-0 data-[state=open]:bg-muted"
          >
            <EyeIcon className="w-4 h-4" />
          </Button>
        )}
        {!disableEdit && (
          <Button
            variant="ghost"
            title="Editar"
            onClick={onClickEdit}
            className="flex h-6 w-6 p-0 data-[state=open]:bg-muted"
          >
            <EditIcon className="w-4 h-4" />
          </Button>
        )}
        {!disableDelete && (
          <Button
            variant="ghost"
            title="Excluir"
            onClick={() => setOpenDeleteDialog(true)}
            className="flex h-6 w-6 p-0 data-[state=open]:bg-muted"
          >
            <TrashIcon className="w-4 h-4" />
          </Button>
        )}
      </div>
      <div className="lg:hidden">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex h-6 w-6 p-0 data-[state=open]:bg-muted"
            >
              <GripHorizontalIcon className="h-4 w-4" />
              <span className="sr-only">Ações</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[160px]">
            {!disableView && (
              <DropdownMenuItem onClick={onClickView}>
                Visualizar
                <DropdownMenuShortcut>
                  <EyeIcon className="w-4 h-4" />
                </DropdownMenuShortcut>
              </DropdownMenuItem>
            )}
            {!disableEdit && (
              <DropdownMenuItem onClick={onClickEdit}>
                Editar
                <DropdownMenuShortcut>
                  <EditIcon className="w-4 h-4" />
                </DropdownMenuShortcut>
              </DropdownMenuItem>
            )}
            {!disableDelete && (
              <DropdownMenuItem onClick={() => setOpenDeleteDialog(true)}>
                Excluir
                <DropdownMenuShortcut>
                  <TrashIcon className="w-4 h-4" />
                </DropdownMenuShortcut>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <ConfirmationDialog
        title="Confirmação"
        message="Deseja realmente excluir?"
        cancelLabel="Cancelar"
        confirmLabel="Confirmar"
        confirmationAction={onDeleteConfirm}
        onOpenChange={setOpenDeleteDialog}
        open={openDeleteDialog}
      />
    </div>
  );
}
