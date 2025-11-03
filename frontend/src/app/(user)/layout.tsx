import UserNavbar from '../../components/UserNavbar'

export default function UserLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <UserNavbar />
      <div className="mt-16 px-8">{children}</div>
    </>
  )
}
