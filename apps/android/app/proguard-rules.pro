# R8 rules for the release build.
#
# Deliberately almost empty. kotlinx.serialization ships its own rules inside
# its artifact, AndroidX ships consumer rules with each library, and the app
# reflects over nothing of its own — every model is decoded through a generated
# serializer, not through class-name lookup. A rule added here should come with
# the crash it prevents.
