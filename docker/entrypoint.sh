#!/bin/bash

if [ $1 = "truffle" ]; then
		# Execute the command...
		$@
		# ... and, give ownership of the files in workspace
		# to whoever executed this one.
		# (Provided they gave us the right environment variables).
		if [ -n "$USER_ID" ] && [ -n "$GROUP_ID" ]; then
			chown -R $USER_ID:$GROUP_ID /workspace/.
		fi

		exit
fi

# Default case:
# Just run the given command
# (i.e. The user wants to `bash`)
exec "$@"
