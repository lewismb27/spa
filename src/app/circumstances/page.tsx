"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";

import { api } from "@/lib/trpc/client";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

export default function NewPage({
  specialCircumstances} : {specialCircumstances: string}) {
  const router = useRouter();
  const FormSchema = z.object({
    circumstance: z.string().min(2).max(500),
  });

  type FormData = z.infer<typeof FormSchema>;

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      circumstance: "",
    },
  });

  //const { mutateAsync: createSubGroupAsync } =
    //api.institution.group.createSubGroup.useMutation();

  //const { mutateAsync: something }

  function onSubmit(values: z.infer<typeof FormSchema>) {
    //void toast.promise(createSubGroupAsync({
    //specialCircumstances,
    //}).then(() => {
    //  router.push();
    //  router.refresh();
    //}),
      
    //);
    console.log(values);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="w flex flex-col items-start gap-3">
          <FormField
            control={form.control}
            name="circumstance"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Special Circumstances</FormLabel>
                <FormControl>
                  <Textarea placeholder="..." {...field} />
                </FormControl>
                <FormDescription>
                  Please describe any special circumstances.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <Separator className="my-14" />
        </div>
        <div className="flex justify-center">
          <Button type="submit" size="lg">
            Submit
          </Button>
        </div>
      </form>
    </Form>
  );
}
