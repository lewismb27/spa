import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { zodResolver } from "@hookform/resolvers/zod";

import { Plus } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const NewStudentSchema = z.object({
  name: z.string(),
  schoolId: z.string(),
  email: z.string().email(),
});

type NewStudent = z.infer<typeof NewStudentSchema>;

export function AddStudents() {
  const [newStudents, setNewStudents] = useState<NewStudent[]>([]);

  const { register, handleSubmit, reset } = useForm<NewStudent>({
    resolver: zodResolver(NewStudentSchema),
  });

  const onSubmit = (data: NewStudent) => {
    setNewStudents((prev) => [data, ...prev]);
    reset();
  };

  return (
    <div className="flex flex-col px-6">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex w-full flex-col items-start gap-3"
      >
        <h3 className="text-2xl">Manually create Student</h3>
        <div className="flex w-full items-center justify-start gap-5">
          <Input className="w-1/4" placeholder="Name" {...register("name")} />
          <Input
            className="w-1/6"
            placeholder="1234567a"
            {...register("schoolId")}
          />
          <Input className="w-2/5" placeholder="Email" {...register("email")} />
          <Button size="icon" variant="secondary">
            <Plus className="h-4 w-4 stroke-white stroke-[3]" />
          </Button>
        </div>
      </form>
      <div className="mt-6 w-full">
        <Table>
          <TableBody>
            {newStudents.map(({ name, email }, i) => (
              <TableRow key={i} className="w-full">
                <TableCell className="w-1/3">{name}</TableCell>
                <TableCell className="pl-8">{email}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="relative my-14">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">OR</span>
        </div>
      </div>
      <div className="flex flex-col gap-6">
        <h3 className="text-2xl">Upload using CSV</h3>
        <div className="flex items-center gap-6">
          <Button variant="outline">add file</Button>
          <p className="text-slate-500">
            (must contain header:{" "}
            <code className="text-slate-600">full_name,school_id,email</code>)
          </p>
        </div>
      </div>
      <Separator className="my-14" />
      <div className="flex justify-end">
        <Button>invite</Button>
      </div>{" "}
    </div>
  );
}
