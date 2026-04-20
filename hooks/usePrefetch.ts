"use client";
/**
 * usePrefetch — โหลดข้อมูลหน้าถัดไปล่วงหน้าตอน hover
 * ใช้แทน Link ธรรมดาในเมนู sidebar/navbar
 *
 * วิธีใช้:
 *   const { prefetch } = usePrefetch()
 *   <div onMouseEnter={() => prefetch("/dashboard/admin")}> ... </div>
 */
import { useRouter } from "next/navigation";
import { useCallback } from "react";

export function usePrefetch() {
  const router = useRouter();

  const prefetch = useCallback(
    (href: string) => {
      router.prefetch(href);
    },
    [router]
  );

  return { prefetch };
}
